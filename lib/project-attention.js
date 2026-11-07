// lib/project-attention.js
//
// "Needs Attention" for ONE project (Project Delivery Pulse): the short list of
// things that are stuck right now, who has to act, and for how long.
//
// This file is the ONE place that decides what needs attention. The UI only
// displays what it returns; it must never re-derive these rules.
//
// It is built in two layers on purpose:
//
//   buildAttentionItems(...)   PURE. Rows in, items out. No database, no clock
//                              (the time is passed in). Every rule lives here,
//                              so every rule can be tested exhaustively.
//   getAttentionForRole(...)   Runs the (few, bounded) queries and calls the
//   getProjectAttention(...)   pure function. The second one adds login/role
//                              checks on top.
//
// THE RULES (rule-based on purpose: no scoring model, no guessing)
//
//   A client request that is OPEN (the client has not answered)
//       -> next action: CLIENT.  "blocking" is EXACTLY the request's own
//          blocksWork flag, the same flag the blocked-time ledger uses. An
//          ordinary open request is NOT a blocker.
//   A client request that is SUBMITTED (answered, not yet accepted)
//       -> next action: TEAM (review it). Never blocking: the client is no
//          longer the one we are waiting on (same rule as blocked-time.js).
//   A milestone that is IN_REVIEW
//       -> next action: CLIENT (approve or ask for changes). Not "blocking":
//          nothing in the data says work stops while it is in review.
//   A milestone that is PENDING / IN_PROGRESS and past its due date
//       -> next action: TEAM. Late, not blocked.
//
//   One item per request and per milestone, never two: "overdue" is a flag on
//   the item (an IN_REVIEW milestone that is also late is ONE item).
//
//   NOT included, deliberately: "the client asked for changes, the team must
//   rework". The data cannot say that reliably (a rejection without a reason
//   leaves rejectionNote empty, and nothing clears it on resubmission), and
//   a wrong item is worse than a missing one. See the Phase 5 notes.
//
// Items never contain request instructions, client answers, file names, or any
// other private text: only titles, dates, flags and ids.

import prisma from './prisma.js'
import { ForbiddenError } from './errors.js'
import { requireProjectMembership } from './project.js'
import { can } from './project-permissions.js'
import { DAY_MS, computeBlockedSummary } from './blocked-time.js'

export const MAX_ITEMS = 50
// Safety caps on how much one project can make us read. A project that hits
// one of them is reported as `truncated`, never silently cut.
const REQUEST_ROW_CAP = 200
const MILESTONE_ROW_CAP = 100
const TITLE_MAX = 200

export const ATTENTION_KINDS = Object.freeze([
  'CLIENT_RESPONSE_PENDING',
  'CLIENT_RESPONSE_NEEDS_REVIEW',
  'MILESTONE_APPROVAL_PENDING',
  'MILESTONE_OVERDUE',
])

const toMs = (value) => (value instanceof Date ? value.getTime() : new Date(value).getTime())

// A due DATE counts as overdue once that whole day has passed. This is the
// same rule the reminder emails already use (requestListHtml in
// lib/emailTemplates.js), so the panel and the emails always agree.
export function isPastDue(dueDate, now) {
  if (!dueDate) return false
  const due = toMs(dueDate)
  return Number.isFinite(due) && due + DAY_MS <= toMs(now)
}

// Whole days between two moments (same rounding as blockedDays in
// blocked-time.js). null when the start is unknown.
function wholeDaysSince(since, now) {
  if (!since) return null
  const start = toMs(since)
  if (!Number.isFinite(start)) return null
  return Math.max(0, Math.floor((toMs(now) - start) / DAY_MS))
}

function clip(text, max) {
  const clean = String(text).replace(/\s+/g, ' ').trim()
  return clean.length <= max ? clean : clean.slice(0, max - 1).trimEnd() + '…'
}

const iso = (value) => (value ? new Date(value).toISOString() : null)

function item({ id, kind, title, nextActionBy, blocking, overdue, since, dueDate, entity, milestoneId = null, now }) {
  return {
    id,
    kind,
    title: clip(title, TITLE_MAX),
    nextActionBy,
    blocking,
    overdue,
    // HIGH = it is late, or it is stopping work and we are waiting on the
    // client. Everything else is NORMAL. Two levels keep it explainable.
    priority: overdue || (blocking && nextActionBy === 'CLIENT') ? 'HIGH' : 'NORMAL',
    since: iso(since),
    waitingDays: wholeDaysSince(since, now),
    dueDate: iso(dueDate),
    entity,
    milestoneId,
  }
}

function requestItem(request, now) {
  const entity = { kind: 'clientRequest', id: request.id }
  const id = `clientRequest:${request.id}`

  if (request.status === 'OPEN') {
    return item({
      id,
      kind: 'CLIENT_RESPONSE_PENDING',
      title: `Waiting for the client: ${request.title}`,
      nextActionBy: 'CLIENT',
      blocking: Boolean(request.blocksWork),
      overdue: isPastDue(request.dueDate, now),
      since: request.createdAt,
      dueDate: request.dueDate,
      entity,
      milestoneId: request.milestoneId ?? null,
      now,
    })
  }

  if (request.status === 'SUBMITTED') {
    return item({
      id,
      kind: 'CLIENT_RESPONSE_NEEDS_REVIEW',
      title: `Review the client's response: ${request.title}`,
      nextActionBy: 'TEAM',
      blocking: false,
      // The client did their part, so the client's due date no longer applies.
      overdue: false,
      since: request.submittedAt ?? null,
      dueDate: request.dueDate,
      entity,
      milestoneId: request.milestoneId ?? null,
      now,
    })
  }

  return null // ACCEPTED, CANCELLED: nothing to do
}

function milestoneItem(milestone, submittedAtById, now) {
  const entity = { kind: 'milestone', id: milestone.id }
  const id = `milestone:${milestone.id}`
  const overdue = isPastDue(milestone.dueDate, now)

  if (milestone.status === 'IN_REVIEW') {
    return item({
      id,
      kind: 'MILESTONE_APPROVAL_PENDING',
      title: `Waiting for the client to approve: ${milestone.title}`,
      nextActionBy: 'CLIENT',
      blocking: false,
      overdue,
      // When it was submitted comes from the timeline. A milestone submitted
      // before events were recorded has no entry, and we say "unknown" (null)
      // rather than guess from updatedAt, which changes on any edit.
      since: submittedAtById.get(milestone.id) ?? null,
      dueDate: milestone.dueDate,
      entity,
      now,
    })
  }

  if ((milestone.status === 'PENDING' || milestone.status === 'IN_PROGRESS') && overdue) {
    return item({
      id,
      kind: 'MILESTONE_OVERDUE',
      title: `Past its due date: ${milestone.title}`,
      nextActionBy: 'TEAM',
      blocking: false,
      overdue: true,
      // It became overdue the moment its due DATE fully passed.
      since: new Date(toMs(milestone.dueDate) + DAY_MS),
      dueDate: milestone.dueDate,
      entity,
      now,
    })
  }

  return null // COMPLETED, or not late
}

// Most urgent first. Fully deterministic (the id is the final tie-break), so
// the same data always produces the same order.
function compareItems(a, b) {
  return (
    (a.priority === 'HIGH' ? 0 : 1) - (b.priority === 'HIGH' ? 0 : 1) ||
    Number(b.overdue) - Number(a.overdue) ||
    Number(b.blocking) - Number(a.blocking) ||
    (b.waitingDays ?? -1) - (a.waitingDays ?? -1) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  )
}

// PURE. `requests` and `milestones` are plain rows; `submittedAtById` maps a
// milestone id to the moment it was last submitted for review.
export function buildAttentionItems({ requests = [], milestones = [], submittedAtById = new Map(), now }) {
  if (!now) throw new Error('buildAttentionItems needs `now`')

  const all = [
    ...requests.map((r) => requestItem(r, now)),
    ...milestones.map((m) => milestoneItem(m, submittedAtById, now)),
  ]
    .filter(Boolean)
    .sort(compareItems)

  // The blocked-time module defines what "open and blocking" means; reuse it
  // for the headline numbers instead of counting them a second time here.
  const open = requests.filter((r) => r.status === 'OPEN')
  const { openBlockingCount, oldestOpenSince } = computeBlockedSummary(open, now)

  return {
    items: all.slice(0, MAX_ITEMS),
    summary: {
      total: all.length,
      high: all.filter((i) => i.priority === 'HIGH').length,
      blocking: openBlockingCount,
      overdue: all.filter((i) => i.overdue).length,
      waitingOnClient: all.filter((i) => i.nextActionBy === 'CLIENT').length,
      waitingOnTeam: all.filter((i) => i.nextActionBy === 'TEAM').length,
      oldestBlockingSince: iso(oldestOpenSince),
    },
  }
}

// Runs the queries for a role that has ALREADY been authorised. Exported
// separately so the role rules can be tested without a database.
export async function getAttentionForRole({ projectId, role, now = new Date() }, db = prisma) {
  const canSeeRequests = can(role, 'viewClientRequests')

  // Two independent, bounded queries, run in parallel. The request query uses
  // the (projectId, status) index, so finished requests are never read.
  const [requests, milestones] = await Promise.all([
    canSeeRequests
      ? db.clientRequest.findMany({
          where: { projectId, status: { in: ['OPEN', 'SUBMITTED'] } },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          take: REQUEST_ROW_CAP,
          select: {
            id: true,
            title: true,
            status: true,
            blocksWork: true,
            dueDate: true,
            createdAt: true,
            submittedAt: true,
            milestoneId: true,
          },
        })
      : [],
    db.milestone.findMany({
      where: { projectId, status: { not: 'COMPLETED' } },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
      take: MILESTONE_ROW_CAP,
      select: { id: true, title: true, status: true, dueDate: true },
    }),
  ])

  // Only when something is actually in review: one extra query for WHEN each
  // was last submitted (newest event wins, so a milestone that went through
  // review twice shows the latest submission).
  const submittedAtById = new Map()
  const inReviewIds = milestones.filter((m) => m.status === 'IN_REVIEW').map((m) => m.id)
  if (inReviewIds.length > 0) {
    const events = await db.projectActivity.findMany({
      where: { projectId, type: 'MILESTONE_SUBMITTED', entityId: { in: inReviewIds } },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      select: { entityId: true, occurredAt: true },
    })
    for (const event of events) {
      if (!submittedAtById.has(event.entityId)) submittedAtById.set(event.entityId, event.occurredAt)
    }
  }

  const result = buildAttentionItems({ requests, milestones, submittedAtById, now })
  return {
    ...result,
    // True if a safety cap was hit, so the list may be incomplete.
    truncated: requests.length >= REQUEST_ROW_CAP || milestones.length >= MILESTONE_ROW_CAP,
    generatedAt: now.toISOString(),
  }
}

export async function getProjectAttention({ userId, projectId, now = new Date() }, db = prisma) {
  // Login/project/workspace checks, exactly like every other project route:
  // 404 for outsiders, 403 for workspace members not on the project.
  const { role } = await requireProjectMembership(userId, projectId, db)

  // Same gate as the activity timeline: they are one panel.
  if (!can(role, 'viewProjectActivity')) {
    throw new ForbiddenError('You do not have permission to view activity on this project.')
  }

  return getAttentionForRole({ projectId, role, now }, db)
}