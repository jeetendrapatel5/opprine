// lib/client-requests.js
//
// ALL database logic for client requests. Routes (and, later, pages) call the
// functions in this file and nothing else - same rule lib/project.js and
// lib/workspace.js follow for their tables. That keeps the security rules in
// ONE place instead of re-implemented in every route.
//
// TWO KINDS OF CALLER
// -------------------
//  1. STAFF (logged in with NextAuth): they act on a project they belong to.
//     Every staff function first calls requireProjectMembership() and then
//     can(role, ...) from lib/project-permissions.js.
//
//  2. THE CLIENT (no account, only a magic-link token): the token is their
//     only credential. Every portal function starts with
//     resolvePortalClient(token), which turns the token into the client and
//     their ONE project. Everything after that is scoped to that project.
//
// THE RULE THAT STOPS CROSS-PROJECT LEAKS
// ----------------------------------------
// A request id taken from a URL or body is NEVER trusted on its own. Every
// query that uses one ALSO filters by projectId - where the projectId comes
// from the staff member's membership or from the portal token, never from
// the request. Someone who guesses another project's request id therefore
// gets "not found", exactly like an id that doesn't exist.
//
// STATE MACHINE
// -------------
//   OPEN --(client answers)--> SUBMITTED --(staff accepts)--> ACCEPTED
//    |                              |
//    +--------(staff cancels)-------+--> CANCELLED
//
// Every transition is ONE conditional UPDATE (`where: { status: <expected> }`),
// so two people clicking at the same moment can't both succeed: the second
// update matches zero rows and gets a clean 409.

import prisma from './prisma.js'
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  LimitExceededError,
} from './errors.js'
import { requireProjectMembership } from './project.js'
import { can } from './project-permissions.js'
import { notify } from './notifications/triggers.js'
import { NOTIFICATION_TYPES } from './notifications/constants.js'
import { sendEmail } from './email.js'
import { clientRequestsEmail, clientRequestSubmittedEmail } from './emailTemplates.js'
import { computeBlockedSummary, groupBlockedByMilestone } from './blocked-time.js'
import { readAndValidateFile, defaultUploader, defaultRemover } from './client-request-files.js'
import {
  parseInput,
  createRequestsSchema,
  updateRequestSchema,
  answerSchemaFor,
} from './client-request-validation.js'

// Soft safety limit (two simultaneous creates could overshoot it slightly -
// fine for a guard against runaway data, not a billing limit).
export const MAX_ACTIVE_REQUESTS_PER_PROJECT = 50

// Most rows one list call returns. A project with more than this many
// requests in its whole history would need pagination - not a realistic
// case for this product today.
const LIST_LIMIT = 500

// ── What we read ────────────────────────────────────────────────────────────
// Explicit selects only (never `include`/whole rows), so a column added to the
// table later can't leak to the client by accident.

const STAFF_SCALARS = {
  id: true,
  projectId: true,
  milestoneId: true,
  title: true,
  instructions: true,
  type: true,
  blocksWork: true,
  dueDate: true,
  status: true,
  answerText: true,
  approved: true,
  fileUrl: true,
  fileName: true,
  fileType: true,
  fileSize: true,
  createdAt: true,
  firstViewedAt: true,
  submittedAt: true,
  acceptedAt: true,
  cancelledAt: true,
  updatedAt: true,
  remindersSent: true,
  lastRemindedAt: true,
  createdByUserId: true,
}

const STAFF_SELECT = {
  ...STAFF_SCALARS,
  milestone: { select: { id: true, title: true } },
  createdBy: { select: { id: true, name: true } },
}

// What the CLIENT may see. Deliberately absent: blocksWork, reminder
// counters, who created it, internal timestamps.
const PORTAL_SELECT = {
  id: true,
  title: true,
  instructions: true,
  type: true,
  dueDate: true,
  status: true,
  answerText: true,
  approved: true,
  fileName: true,
  fileSize: true,
  createdAt: true,
  submittedAt: true,
  milestone: { select: { id: true, title: true } },
}

const buildPortalUrl = (magicToken) => {
  const base = process.env.NEXTAUTH_URL
  return base ? `${base.replace(/\/+$/, '')}/portal/${magicToken}` : null
}

async function requireRequestPermission(userId, projectId, action, db) {
  const { role } = await requireProjectMembership(userId, projectId, db)
  if (!can(role, action)) {
    throw new ForbiddenError(
      action === 'manageClientRequests'
        ? 'You do not have permission to manage client requests on this project.'
        : 'You do not have permission to view client requests on this project.'
    )
  }
  return role
}

// ═════════════════════════════════════════════════════════════════════════════
// STAFF SIDE
// ═════════════════════════════════════════════════════════════════════════════

// Creates one or more requests in a single INSERT (so it's all-or-nothing) and
// sends the client ONE email for the whole batch - five requests must not mean
// five emails.
//
// Returns { requests, emailSent }. A failed email never fails the creation:
// the requests exist and the client will see them in the portal, so the caller
// just gets emailSent: false and can tell the user.
export async function createClientRequests({ userId, projectId, input }, db = prisma) {
  await requireRequestPermission(userId, projectId, 'manageClientRequests', db)
  const data = parseInput(createRequestsSchema, input)

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      name: true,
      client: { select: { name: true, email: true, magicToken: true } },
    },
  })
  if (!project) throw new NotFoundError('Project not found.')

  // Project.client is optional in the schema. Without a client there is
  // nobody to ask (no email, no portal link).
  if (!project.client) {
    throw new ValidationError('Add a client to this project before sending requests.')
  }

  // The milestone must belong to THIS project - otherwise a member of
  // project A could attach requests to project B's milestone.
  if (data.milestoneId) {
    const milestone = await db.milestone.findFirst({
      where: { id: data.milestoneId, projectId },
      select: { id: true },
    })
    if (!milestone) throw new NotFoundError('Milestone not found.')
  }

  const active = await db.clientRequest.count({
    where: { projectId, status: { in: ['OPEN', 'SUBMITTED'] } },
  })
  if (active + data.requests.length > MAX_ACTIVE_REQUESTS_PER_PROJECT) {
    throw new LimitExceededError(
      `A project can have at most ${MAX_ACTIVE_REQUESTS_PER_PROJECT} active requests. Accept or cancel some before adding more.`
    )
  }

  const created = await db.clientRequest.createManyAndReturn({
    data: data.requests.map((r) => ({
      projectId,
      milestoneId: data.milestoneId,
      title: r.title,
      instructions: r.instructions,
      type: r.type,
      blocksWork: r.blocksWork,
      dueDate: r.dueDate,
      createdByUserId: userId,
    })),
    select: STAFF_SCALARS,
  })

  let emailSent = false
  if (data.notifyClient && project.client.email) {
    const portalUrl = buildPortalUrl(project.client.magicToken)
    if (!portalUrl) {
      console.error('[client-requests] NEXTAUTH_URL is not set - cannot build the portal link, skipping email.')
    } else {
      const actor = await db.user.findUnique({ where: { id: userId }, select: { name: true } })
      const { subject, html } = clientRequestsEmail({
        clientName: project.client.name,
        freelancerName: actor?.name ?? 'Your project team',
        projectName: project.name,
        requests: created.map((r) => ({ title: r.title, dueDate: r.dueDate })),
        portalUrl,
      })
      // Awaited on purpose: on serverless hosts, work left running after the
      // response is sent can be cut off. sendEmail() never throws.
      const result = await sendEmail({ to: project.client.email, subject, html })
      emailSent = result.success
    }
  }

  return { requests: created, emailSent }
}

// The project's requests (newest first) plus the blocked-time ledger:
// { requests, blocked: { project, milestones: { [id]: summary }, noMilestone } }
export async function listProjectRequests({ userId, projectId }, db = prisma) {
  await requireRequestPermission(userId, projectId, 'viewClientRequests', db)

  const requests = await db.clientRequest.findMany({
    where: { projectId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: LIST_LIMIT,
    select: STAFF_SELECT,
  })

  return { requests, blocked: groupBlockedByMilestone(requests) }
}

const conflictMessage = (action, status) => {
  if (action === 'accept') {
    return status === 'OPEN'
      ? 'The client has not answered this request yet.'
      : `This request is already ${status.toLowerCase()}.`
  }
  if (action === 'cancel') return `This request is already ${status.toLowerCase()}.`
  return 'Only requests that are still waiting on the client can be edited.'
}

// accept | cancel | update. Each is a single conditional UPDATE (see the
// state machine at the top of this file); zero rows matched means either the
// request isn't in this project (404) or it's in the wrong state (409).
export async function updateClientRequest({ userId, projectId, requestId, input }, db = prisma) {
  await requireRequestPermission(userId, projectId, 'manageClientRequests', db)
  const data = parseInput(updateRequestSchema, input)

  const now = new Date()
  const scope = { id: requestId, projectId }

  let result
  if (data.action === 'accept') {
    result = await db.clientRequest.updateMany({
      where: { ...scope, status: 'SUBMITTED' },
      data: { status: 'ACCEPTED', acceptedAt: now },
    })
  } else if (data.action === 'cancel') {
    result = await db.clientRequest.updateMany({
      where: { ...scope, status: { in: ['OPEN', 'SUBMITTED'] } },
      data: { status: 'CANCELLED', cancelledAt: now },
    })
  } else {
    const patch = {}
    if (data.title !== undefined) patch.title = data.title
    if (data.instructions !== undefined) patch.instructions = data.instructions || null
    if (data.dueDate !== undefined) patch.dueDate = data.dueDate
    result = await db.clientRequest.updateMany({
      where: { ...scope, status: 'OPEN' },
      data: patch,
    })
  }

  if (result.count === 0) {
    const existing = await db.clientRequest.findFirst({ where: scope, select: { status: true } })
    if (!existing) throw new NotFoundError('Request not found.')
    throw new ConflictError(conflictMessage(data.action, existing.status))
  }

  return db.clientRequest.findFirst({ where: scope, select: STAFF_SELECT })
}

// ═════════════════════════════════════════════════════════════════════════════
// PORTAL SIDE (the client, identified only by their magic-link token)
// ═════════════════════════════════════════════════════════════════════════════

// Token -> { id, name, email, projectId, project: {...} }.
// EVERY portal function starts here. Invalid, unknown and malformed tokens all
// look identical (404), so nothing can be learned by probing.
//
// Kept as the single place that understands tokens on purpose: if magic
// tokens are ever hardened (longer random value, expiry, hashing), this one
// function is where it changes.
export async function resolvePortalClient(token, db = prisma) {
  if (typeof token !== 'string' || token.length === 0 || token.length > 200) {
    throw new NotFoundError('Invalid access token.')
  }

  const client = await db.client.findUnique({
    where: { magicToken: token },
    select: {
      id: true,
      name: true,
      email: true,
      projectId: true,
      project: {
        select: {
          id: true,
          name: true,
          workspaceId: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  })
  if (!client) throw new NotFoundError('Invalid access token.')
  return client
}

// Strips a row down to exactly what the portal may show.
const toPortalRequest = (row) => ({
  id: row.id,
  title: row.title,
  instructions: row.instructions,
  type: row.type,
  dueDate: row.dueDate,
  status: row.status,
  answerText: row.answerText,
  approved: row.approved,
  fileName: row.fileName,
  fileSize: row.fileSize,
  createdAt: row.createdAt,
  submittedAt: row.submittedAt,
  milestone: row.milestone,
})

// What the client sees: their requests (cancelled ones are hidden) and the
// same project-wide blocked-time number the team sees.
//   { requests: [...], blocked: { blockedDays, openBlockingCount, oldestOpenSince } }
export async function listPortalRequests(token, db = prisma) {
  const client = await resolvePortalClient(token, db)

  const rows = await db.clientRequest.findMany({
    where: { projectId: client.projectId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: LIST_LIMIT,
    select: { ...PORTAL_SELECT, blocksWork: true, cancelledAt: true },
  })

  // Computed over ALL rows (cancelled included) so the client and the team
  // are always looking at the same number.
  const { blockedDays, openBlockingCount, oldestOpenSince } = computeBlockedSummary(rows)

  return {
    requests: rows.filter((r) => r.status !== 'CANCELLED').map(toPortalRequest),
    blocked: { blockedDays, openBlockingCount, oldestOpenSince },
  }
}

// Records that the client opened the portal while requests were waiting.
// Meant to be called by the portal PAGE (not by a GET API route, so a plain
// read never has a side effect). Only fills the field the first time.
export async function markRequestsViewed(token, db = prisma) {
  const client = await resolvePortalClient(token, db)
  const result = await db.clientRequest.updateMany({
    where: { projectId: client.projectId, status: 'OPEN', firstViewedAt: null },
    data: { firstViewedAt: new Date() },
  })
  return { updated: result.count }
}

// Tells the team a request was answered: an in-app notification plus an email
// to the project owner. The answer is already saved when this runs, so NOTHING
// in here may make the caller fail: each step handles its own errors.
async function notifyTeamOfAnswer(client, request, db) {
  try {
    await notify(
      NOTIFICATION_TYPES.CLIENT_REQUEST_SUBMITTED,
      {
        workspaceId: client.project.workspaceId,
        projectId: client.projectId,
        projectName: client.project.name,
        request: { id: request.id, title: request.title },
        clientName: client.name,
      },
      db
    )
  } catch (err) {
    console.error('[client-requests] Failed to create the in-app notification:', err)
  }

  const owner = client.project.user
  const base = process.env.NEXTAUTH_URL
  if (owner?.email && base) {
    const { subject, html } = clientRequestSubmittedEmail({
      freelancerName: owner.name,
      clientName: client.name,
      projectName: client.project.name,
      requestTitle: request.title,
      dashboardUrl: `${base.replace(/\/+$/, '')}/dashboard/projects/${client.projectId}`,
    })
    await sendEmail({ to: owner.email, subject, html })
  }
}

// The client answers one request.
export async function submitPortalRequest({ token, requestId, input }, db = prisma) {
  const client = await resolvePortalClient(token, db)
  const scope = { id: requestId, projectId: client.projectId }

  const request = await db.clientRequest.findFirst({
    where: scope,
    select: { id: true, title: true, type: true, status: true },
  })
  // Cancelled requests are invisible to the client, so they are "not found".
  if (!request || request.status === 'CANCELLED') throw new NotFoundError('Request not found.')
  if (request.status !== 'OPEN') {
    throw new ConflictError('This request has already been answered.')
  }

  const answer = parseInput(answerSchemaFor(request.type), input)

  // The conditional update is what makes "answer exactly once" true even if
  // the client double-clicks or two tabs submit together.
  const result = await db.clientRequest.updateMany({
    where: { ...scope, status: 'OPEN' },
    data: {
      status: 'SUBMITTED',
      submittedAt: new Date(),
      answerText: answer.answerText ?? null,
      approved: request.type === 'APPROVAL' ? answer.approved : null,
    },
  })
  if (result.count === 0) {
    throw new ConflictError('This request has already been answered.')
  }

  await notifyTeamOfAnswer(client, request, db)

  const updated = await db.clientRequest.findFirst({ where: scope, select: PORTAL_SELECT })
  return toPortalRequest(updated)
}

// Best-effort removal of an upload that ended up not being used.
async function discardUpload(remover, stored, ext) {
  try {
    await remover({ publicId: stored.publicId, ext })
  } catch (err) {
    console.error('[client-requests] Could not delete an unused upload:', stored.publicId, err)
  }
}

// The client answers a FILE request by uploading a file.
//
// ORDER MATTERS: validate everything first, upload second, record last.
//   1. token -> project, request in that project, still OPEN, and a FILE request
//   2. the file passes the checks in lib/client-request-files.js
//   3. upload to Cloudinary
//   4. ONE conditional update OPEN -> SUBMITTED
// If step 4 loses a race (someone answered meanwhile) or fails, the file that
// was just uploaded is deleted again so nothing is left orphaned.
//
// `uploader` / `remover` can be swapped in tests so they never touch Cloudinary.
export async function submitPortalFileRequest(
  { token, requestId, file, uploader = defaultUploader, remover = defaultRemover },
  db = prisma
) {
  const client = await resolvePortalClient(token, db)
  const scope = { id: requestId, projectId: client.projectId }

  const request = await db.clientRequest.findFirst({
    where: scope,
    select: { id: true, title: true, type: true, status: true },
  })
  if (!request || request.status === 'CANCELLED') throw new NotFoundError('Request not found.')
  if (request.status !== 'OPEN') throw new ConflictError('This request has already been answered.')
  if (request.type !== 'FILE') {
    throw new ValidationError('This request is answered in writing, not with a file.')
  }

  const checked = await readAndValidateFile(file)

  const stored = await uploader({
    buffer: checked.buffer,
    projectId: client.projectId,
    requestId: request.id,
    ext: checked.ext,
  })

  let result
  try {
    result = await db.clientRequest.updateMany({
      where: { ...scope, status: 'OPEN' },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        fileUrl: stored.url,
        filePublicId: stored.publicId,
        fileName: checked.fileName,
        fileType: checked.mime,
        fileSize: stored.bytes,
      },
    })
  } catch (err) {
    await discardUpload(remover, stored, checked.ext)
    throw err
  }
  if (result.count === 0) {
    await discardUpload(remover, stored, checked.ext)
    throw new ConflictError('This request has already been answered.')
  }

  await notifyTeamOfAnswer(client, request, db)

  const updated = await db.clientRequest.findFirst({ where: scope, select: PORTAL_SELECT })
  return toPortalRequest(updated)
}