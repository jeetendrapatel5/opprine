// lib/project-activity-feed.js
//
// READING the project timeline (the ProjectActivity rows that
// lib/project-activity.js writes). Two audiences, two functions, and they are
// deliberately different shapes so one cannot leak into the other:
//
//   listProjectActivity  - STAFF (a logged-in team member). Sees internal and
//                          client-visible events, with metadata, filtered by
//                          what their project role is allowed to see.
//   listPortalActivity   - the CLIENT (identified by their magic-link token).
//                          Sees ONLY client-visible events, as a minimal
//                          projection. NOTHING calls this yet: Phase 1 decided
//                          this feature has no client-facing timeline. It is
//                          here, tested, so that adding one later is just a
//                          route that calls it, not new security logic.
//
// Both return { items, nextCursor }. Pass nextCursor back as `cursor` to get
// the next (older) page; null means there is nothing older.
//
// PAGINATION is keyset ("cursor") based on (occurredAt, id), newest first.
// That matches the index on ProjectActivity exactly, stays fast however deep
// you page, and never skips or repeats a row when new events arrive (an
// offset-based page would). `id` breaks ties between events with the same
// timestamp.
//
// Like the other service files, the last argument is `db = prisma` so tests
// can pass a fake.

import { z } from 'zod'
import prisma from './prisma.js'
import { ForbiddenError, ValidationError } from './errors.js'
import { requireProjectMembership } from './project.js'
import { can } from './project-permissions.js'
import { parseInput } from './client-request-validation.js'
import { resolvePortalClient } from './client-requests.js'
import { ACTIVITY_TYPES, CLIENT_VISIBLE_TYPES, getActivityEntityKind } from './project-activity.js'

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 50

// Events about client requests. A role that may not view client requests must
// not learn about them through the timeline either.
const REQUEST_EVENT_TYPES = ACTIVITY_TYPES.filter((type) => getActivityEntityKind(type) === 'clientRequest')

const querySchema = z.object({
  limit: z.coerce
    .number()
    .int('limit must be a whole number.')
    .min(1, 'limit must be at least 1.')
    .max(MAX_PAGE_SIZE, `limit can be at most ${MAX_PAGE_SIZE}.`)
    .default(DEFAULT_PAGE_SIZE),
  cursor: z.string().max(300, 'Invalid cursor.').optional(),
})

// ── Cursors ─────────────────────────────────────────────────────────────────
// An opaque string for callers; internally base64url of ["<ISO time>", "<id>"].
// It is NOT signed and does not need to be: it only says where to continue
// from, and every query is still scoped to the project and the caller's
// visibility, so a forged cursor can reveal nothing extra.

export function encodeCursor(row) {
  return Buffer.from(JSON.stringify([row.occurredAt.toISOString(), row.id])).toString('base64url')
}

function decodeCursor(value) {
  const invalid = () => new ValidationError('Invalid cursor.')
  let parsed
  try {
    parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
  } catch {
    throw invalid()
  }
  if (!Array.isArray(parsed) || parsed.length !== 2) throw invalid()
  const [iso, id] = parsed
  if (typeof iso !== 'string' || typeof id !== 'string' || id.length === 0 || id.length > 100) throw invalid()
  const occurredAt = new Date(iso)
  // Round-trip check: rejects things like "2026-13-45" or "tomorrow".
  if (Number.isNaN(occurredAt.getTime()) || occurredAt.toISOString() !== iso) throw invalid()
  return { occurredAt, id }
}

// One page of rows. `where` already contains the project scope and the
// visibility rules; this only adds the cursor condition and the paging.
async function fetchPage(db, { where, select, limit, cursor }) {
  let pageWhere = where
  if (cursor) {
    const after = decodeCursor(cursor)
    pageWhere = {
      ...where,
      OR: [
        { occurredAt: { lt: after.occurredAt } },
        { occurredAt: after.occurredAt, id: { lt: after.id } },
      ],
    }
  }

  // limit + 1: the extra row only tells us whether an older page exists.
  const rows = await db.projectActivity.findMany({
    where: pageWhere,
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    select,
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  return { page, nextCursor: hasMore ? encodeCursor(page[page.length - 1]) : null }
}

// ── Staff ───────────────────────────────────────────────────────────────────

const STAFF_SELECT = {
  id: true,
  type: true,
  title: true,
  actorType: true,
  actorUserId: true,
  actorName: true,
  entityId: true,
  metadata: true,
  visibility: true,
  occurredAt: true,
}

// Which events a staff role may see, as a database filter. Exported so the
// rule can be tested for any role, including ones that do not exist yet.
export function buildStaffWhere(projectId, role) {
  const where = { projectId }
  if (!can(role, 'viewClientRequests')) where.type = { notIn: REQUEST_EVENT_TYPES }
  return where
}

function toStaffItem(row, canSeeClientName) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    occurredAt: row.occurredAt,
    visibility: row.visibility,
    actor: {
      type: row.actorType,
      userId: row.actorUserId,
      // Roles without viewClient (CONTRIBUTOR) never see the client's name
      // anywhere else in the app, so the timeline must not reveal it either.
      name: row.actorType === 'CLIENT' && !canSeeClientName ? null : row.actorName,
    },
    // Which kind of thing `entity.id` is. The UI uses it to build the link.
    entity: { kind: getActivityEntityKind(row.type), id: row.entityId },
    metadata: row.metadata ?? null,
  }
}

// `query` is the raw, untrusted input: { limit?, cursor? }.
export async function listProjectActivity({ userId, projectId, query }, db = prisma) {
  // 1. Who is this, and are they on THIS project? (404 for outsiders, 403 for
  //    workspace members who are not assigned to it.) Workspace isolation
  //    comes from here: the project is looked up through its workspace.
  const { role } = await requireProjectMembership(userId, projectId, db)

  // 2. May their role see the timeline at all? (VIEWER fails closed.)
  if (!can(role, 'viewProjectActivity')) {
    throw new ForbiddenError('You do not have permission to view activity on this project.')
  }

  // 3. Validate the paging input.
  const { limit, cursor } = parseInput(querySchema, query ?? {})

  // 4. Scope to this project and to what the role may see. Filtering happens
  //    in the database (not after the fact) so pages stay full and the
  //    cursor stays correct.
  const where = buildStaffWhere(projectId, role)

  // ONE query for the events, no per-row lookups: everything a row needs
  // (title, actor name, entity id, metadata) is stored on the row itself.
  // Alongside the events: when THIS user last looked (one primary-key lookup).
  // The UI compares it with each event's time to mark what is new.
  const [{ page, nextCursor }, seen] = await Promise.all([
    fetchPage(db, { where, select: STAFF_SELECT, limit, cursor }),
    db.projectActivityRead.findUnique({
      where: { userId_projectId: { userId, projectId } },
      select: { lastSeenAt: true },
    }),
  ])

  const canSeeClientName = can(role, 'viewClient')
  return {
    items: page.map((row) => toStaffItem(row, canSeeClientName)),
    nextCursor,
    lastSeenAt: seen?.lastSeenAt ?? null, // null = never opened the panel
  }
}

// "I have now seen everything up to `through`." The moment only moves
// FORWARD, and never past the server's clock. `body.through` is the time of
// the newest event the person was shown; leaving it out means "now".
export async function markProjectActivitySeen({ userId, projectId, body }, db = prisma) {
  const { role } = await requireProjectMembership(userId, projectId, db)
  if (!can(role, 'viewProjectActivity')) {
    throw new ForbiddenError('You do not have permission to view activity on this project.')
  }

  const now = Date.now()
  let through = now
  if (body?.through !== undefined && body?.through !== null) {
    const parsed = typeof body.through === 'string' ? Date.parse(body.through) : NaN
    if (Number.isNaN(parsed)) throw new ValidationError('through must be a valid date.')
    through = Math.min(parsed, now)
  }
  const at = new Date(through)

  // Two plain statements instead of an upsert: insert if missing, then raise
  // only if the stored time is older. Two tabs can never move it backwards.
  const key = { userId, projectId }
  await db.projectActivityRead.createMany({ data: [{ ...key, lastSeenAt: at }], skipDuplicates: true })
  await db.projectActivityRead.updateMany({ where: { ...key, lastSeenAt: { lt: at } }, data: { lastSeenAt: at } })
  const row = await db.projectActivityRead.findUnique({
    where: { userId_projectId: key },
    select: { lastSeenAt: true },
  })
  return { lastSeenAt: row?.lastSeenAt ?? at }
}

// ── Client (portal) ─────────────────────────────────────────────────────────

// The ONLY columns that may ever reach a client. Deliberately absent:
// metadata (it holds internal flags such as blocksWork), entityId,
// actorUserId, visibility and dedupeKey.
const PORTAL_SELECT = {
  id: true,
  type: true,
  title: true,
  actorType: true,
  actorName: true,
  occurredAt: true,
}

function toPortalItem(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    occurredAt: row.occurredAt,
    // Team members' names are not shown to the client here: "USER" is
    // displayed as "Project team". The client's own name and "GitHub" are.
    actor: { type: row.actorType, name: row.actorType === 'USER' ? null : row.actorName },
  }
}

export async function listPortalActivity({ token, query }, db = prisma) {
  const client = await resolvePortalClient(token, db)
  const { limit, cursor } = parseInput(querySchema, query ?? {})

  // TWO independent guards: the stored visibility AND an allowlist of types.
  // Either one alone would keep internal events out; both must agree.
  const where = {
    projectId: client.projectId,
    visibility: 'CLIENT',
    type: { in: [...CLIENT_VISIBLE_TYPES] },
  }

  const { page, nextCursor } = await fetchPage(db, { where, select: PORTAL_SELECT, limit, cursor })
  return { items: page.map(toPortalItem), nextCursor }
}