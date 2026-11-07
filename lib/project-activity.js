// lib/project-activity.js
//
// The ONE place that builds and writes ProjectActivity rows (the "Project
// Delivery Pulse" timeline). Nothing else should call
// db.projectActivity.create* directly.
//
// How to use it from a route or service:
//
//   await prisma.$transaction(async (tx) => {
//     const update = await tx.update.create({ ... })        // the real change
//     await recordActivity(tx, {                            // its event
//       projectId,
//       type: 'PROJECT_UPDATE_POSTED',
//       actor: { type: 'USER', userId, name },
//       entityId: update.id,
//       metadata: { excerpt: update.text },
//     })
//   })
//
// Design rules (see model ProjectActivity in prisma/schema.prisma):
//
//   1. `db` is REQUIRED and has no default. This file deliberately does not
//      import the global prisma client, so you cannot write an event outside
//      the transaction of the change it describes by forgetting to pass `tx`.
//      (It also keeps this file testable without a database.)
//   2. Callers say WHAT happened. This file decides the title, visibility,
//      allowed actors, metadata shape and dedupe key for every type, so those
//      rules live in one reviewable table (DEFINITIONS) instead of being
//      scattered across routes.
//   3. Callers can never choose visibility. Anything not marked CLIENT in
//      DEFINITIONS is INTERNAL.
//   4. Bad input THROWS. Inside a transaction that rolls the whole change
//      back, which is intended: a timeline that silently misses events is not
//      trustworthy. To make that safe, display text is CLIPPED, never
//      rejected, so a long milestone title can never block a real action.
//   5. Recording is idempotent. Rows are inserted with skipDuplicates, and the
//      dedupe key is built from real ids, so retries and webhook redeliveries
//      cannot create a second row for the same event.

import { z } from 'zod'

export class ActivityRecordingError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ActivityRecordingError'
  }
}

function fail(message) {
  throw new ActivityRecordingError(message)
}

const TITLE_MAX = 200
const ACTOR_NAME_MAX = 120
const FALLBACK_TEXT = 'Untitled'

// Collapse whitespace and cut to `max` characters (adding an ellipsis).
function clip(value, max) {
  const text = String(value).replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  return text.slice(0, max - 1).trimEnd() + '…'
}

const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0

// Display text in metadata: always accepted, clipped to `max`.
const display = (max) => z.string().transform((s) => clip(s, max) || FALLBACK_TEXT)

// Optional display text. null / undefined / blank all become "not present".
const optionalDisplay = (max) =>
  z
    .string()
    .nullish()
    .transform((s) => (s == null ? undefined : clip(s, max) || undefined))

const optionalId = z
  .string()
  .nullish()
  .transform((s) => s || undefined)

// ── Metadata shapes ─────────────────────────────────────────────────────────
// strictObject: an unexpected key is an error. This is what stops a caller
// from accidentally copying a private field into metadata. The row's
// `entityId` already points at the main record, so metadata only holds small
// display snapshots (and a secondary link where needed). Worst case is well
// under 1 KB because every string is clipped.

const milestoneMeta = z.strictObject({ milestoneTitle: display(120) })

const milestoneNoteMeta = z.strictObject({
  milestoneId: z.string().min(1),
  milestoneTitle: display(120),
})

const requestMeta = z.strictObject({
  requestTitle: display(120),
  requestType: z.enum(['TEXT', 'APPROVAL', 'FILE']),
  blocksWork: z.boolean(),
  milestoneId: optionalId,
})

// Milestones move through statuses repeatedly (IN_REVIEW -> rejected ->
// IN_REVIEW again), so each real transition needs its own key. The caller
// passes the `updatedAt` of the row it just changed as `occurredAt`: same
// committed change -> same key, a later transition -> a different key.
const milestoneTransitionKey = ({ type, entityId, occurredAt }) =>
  `milestone:${entityId}:${type}:${occurredAt.getTime()}`

// ── DEFINITIONS: the one table that says what each event type means ─────────
//   visibility : CLIENT or INTERNAL (never chosen by callers)
//   actors     : which actor types may perform it
//   entity     : what `entityId` points at (see getActivityEntityKind)
//   needs      : extra input fields the caller MUST provide
//   metadata   : zod schema for the metadata object
//   title      : builds the human-readable sentence stored on the row
//   key        : builds the dedupe key
//
// Keep this in sync with `enum ProjectActivityType` in the Prisma schema; a
// test fails if they drift apart.
const DEFINITIONS = {
  PROJECT_UPDATE_POSTED: {
    visibility: 'CLIENT',
    actors: ['USER'],
    entity: 'update',
    metadata: z.strictObject({ excerpt: optionalDisplay(160) }),
    title: () => 'Project update posted',
    key: ({ entityId }) => `update:${entityId}:posted`,
  },

  // A GitHub push is what Opprine calls a deployment update today. The
  // dedupe key is the FULL commit sha (passed as `externalId`), so a webhook
  // redelivery is recognised even though the Update row stores only 7 chars.
  GITHUB_PUSH: {
    visibility: 'CLIENT',
    actors: ['INTEGRATION'],
    entity: 'update',
    needs: ['externalId'],
    metadata: z.strictObject({ commitSha: display(40) }),
    title: () => 'Code pushed to GitHub',
    key: ({ externalId }) => `github:${externalId}`,
  },

  MILESTONE_CREATED: {
    visibility: 'INTERNAL',
    actors: ['USER'],
    entity: 'milestone',
    metadata: milestoneMeta,
    title: (m) => `Milestone “${m.milestoneTitle}” created`,
    key: ({ entityId }) => `milestone:${entityId}:created`,
  },
  MILESTONE_SUBMITTED: {
    visibility: 'CLIENT',
    actors: ['USER'],
    entity: 'milestone',
    needs: ['occurredAt'],
    metadata: milestoneMeta,
    title: (m) => `“${m.milestoneTitle}” submitted for review`,
    key: milestoneTransitionKey,
  },
  MILESTONE_APPROVED: {
    visibility: 'CLIENT',
    actors: ['CLIENT'],
    entity: 'milestone',
    needs: ['occurredAt'],
    metadata: milestoneMeta,
    title: (m) => `“${m.milestoneTitle}” approved by the client`,
    key: milestoneTransitionKey,
  },
  MILESTONE_CHANGES_REQUESTED: {
    visibility: 'CLIENT',
    actors: ['CLIENT'],
    entity: 'milestone',
    needs: ['occurredAt'],
    metadata: milestoneMeta,
    title: (m) => `Client requested changes to “${m.milestoneTitle}”`,
    key: milestoneTransitionKey,
  },
  MILESTONE_COMPLETED: {
    visibility: 'INTERNAL',
    actors: ['USER'],
    entity: 'milestone',
    needs: ['occurredAt'],
    metadata: milestoneMeta,
    title: (m) => `“${m.milestoneTitle}” marked complete`,
    key: milestoneTransitionKey,
  },

  // entityId = the MilestoneUpdate id; metadata links back to the milestone.
  MILESTONE_UPDATE_POSTED: {
    visibility: 'INTERNAL',
    actors: ['USER'],
    entity: 'milestoneUpdate',
    metadata: milestoneNoteMeta,
    title: (m) => `Progress note added to “${m.milestoneTitle}”`,
    key: ({ entityId }) => `milestoneUpdate:${entityId}:posted`,
  },
  DELIVERABLE_UPLOADED: {
    visibility: 'INTERNAL',
    actors: ['USER'],
    entity: 'milestoneUpdate',
    metadata: milestoneNoteMeta,
    title: (m) => `Deliverable uploaded to “${m.milestoneTitle}”`,
    key: ({ entityId }) => `milestoneUpdate:${entityId}:posted`,
  },

  // A request has one waiting period and cannot be reopened, so each of these
  // can happen at most once per request: the request id alone is a safe key.
  CLIENT_REQUEST_CREATED: {
    visibility: 'CLIENT',
    actors: ['USER'],
    entity: 'clientRequest',
    metadata: requestMeta,
    title: (m) => `Requested from client: ${m.requestTitle}`,
    key: ({ entityId }) => `request:${entityId}:created`,
  },
  CLIENT_REQUEST_SUBMITTED: {
    visibility: 'CLIENT',
    actors: ['CLIENT'],
    entity: 'clientRequest',
    metadata: requestMeta,
    title: (m) => `Client responded to “${m.requestTitle}”`,
    key: ({ entityId }) => `request:${entityId}:submitted`,
  },
  CLIENT_REQUEST_ACCEPTED: {
    visibility: 'CLIENT',
    actors: ['USER'],
    entity: 'clientRequest',
    metadata: requestMeta,
    title: (m) => `Response to “${m.requestTitle}” accepted`,
    key: ({ entityId }) => `request:${entityId}:accepted`,
  },
  // INTERNAL on purpose: the client portal deliberately hides cancelled
  // requests (see listPortalRequests in lib/client-requests.js), so a
  // client-facing timeline must not announce them either.
  CLIENT_REQUEST_CANCELLED: {
    visibility: 'INTERNAL',
    actors: ['USER'],
    entity: 'clientRequest',
    metadata: requestMeta,
    title: (m) => `Request “${m.requestTitle}” cancelled`,
    key: ({ entityId }) => `request:${entityId}:cancelled`,
  },
}

export const ACTIVITY_TYPES = Object.freeze(Object.keys(DEFINITIONS))

// Types a client may ever see. Phase 4 uses this as a SECOND guard on top of
// the stored `visibility` column.
export const CLIENT_VISIBLE_TYPES = Object.freeze(
  ACTIVITY_TYPES.filter((type) => DEFINITIONS[type].visibility === 'CLIENT')
)

// What `entityId` points at for a given type:
// 'update' | 'milestone' | 'milestoneUpdate' | 'clientRequest'.
export function getActivityEntityKind(type) {
  return DEFINITIONS[type]?.entity ?? null
}

function parseActor(def, type, actor) {
  if (!actor || !def.actors.includes(actor.type)) {
    fail(`${type} cannot be performed by an actor of type ${actor?.type}`)
  }
  if (actor.type === 'USER') {
    if (!isNonEmptyString(actor.userId)) fail(`${type} needs actor.userId for a USER actor`)
  } else if (actor.userId) {
    fail(`Only USER actors carry a userId (got one on a ${actor.type} actor)`)
  }
  const name = actor.name ? clip(actor.name, ACTOR_NAME_MAX) : ''
  return {
    actorType: actor.type,
    actorUserId: actor.type === 'USER' ? actor.userId : null,
    actorName: name || null,
  }
}

// Pure function: validates one event and returns the exact row to insert.
// Exported so it can be unit-tested without a database.
export function buildActivityRow(input) {
  const type = input?.type
  const def = DEFINITIONS[type]
  if (!def) fail(`Unknown activity type: ${type}`)

  if (!isNonEmptyString(input.projectId)) fail(`${type} needs a projectId`)
  if (!isNonEmptyString(input.entityId)) fail(`${type} needs an entityId`)

  for (const field of def.needs ?? []) {
    if (input[field] == null || input[field] === '') fail(`${type} needs ${field}`)
  }

  const occurredAt = input.occurredAt ?? new Date()
  if (!(occurredAt instanceof Date) || Number.isNaN(occurredAt.getTime())) {
    fail(`${type} has an invalid occurredAt`)
  }

  const actor = parseActor(def, type, input.actor)

  const parsed = def.metadata.safeParse(input.metadata ?? {})
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(metadata)'}: ${issue.message}`)
      .join('; ')
    fail(`Invalid metadata for ${type}: ${problems}`)
  }

  // Keep only keys that actually have a value.
  const metadata = Object.fromEntries(
    Object.entries(parsed.data).filter(([, value]) => value !== undefined)
  )

  const row = {
    projectId: input.projectId,
    type,
    title: clip(def.title(parsed.data), TITLE_MAX),
    ...actor,
    entityId: input.entityId,
    // Deliberately comes from the table, never from `input`.
    visibility: def.visibility,
    occurredAt,
    dedupeKey: def.key({
      type,
      entityId: input.entityId,
      occurredAt,
      externalId: input.externalId,
    }),
  }
  // Omitted (not null) when empty: Prisma wants special values for Json nulls.
  if (Object.keys(metadata).length > 0) row.metadata = metadata
  return row
}

function assertDb(db) {
  if (typeof db?.projectActivity?.createMany !== 'function') {
    fail('recordActivity needs a Prisma client or transaction client as its first argument')
  }
}

// Record several events in ONE insert (e.g. creating many client requests at
// once). Returns { created, skipped }: `skipped` rows were duplicates of an
// event that was already recorded.
export async function recordActivities(db, inputs) {
  assertDb(db)
  const rows = inputs.map(buildActivityRow)
  if (rows.length === 0) return { created: 0, skipped: 0 }
  const result = await db.projectActivity.createMany({ data: rows, skipDuplicates: true })
  return { created: result.count, skipped: rows.length - result.count }
}

// Record one event. `created` is false when the same event was already
// recorded, which callers (e.g. the GitHub webhook) can use to avoid doing the
// real work twice.
export async function recordActivity(db, input) {
  const { created } = await recordActivities(db, [input])
  return { created: created === 1 }
}