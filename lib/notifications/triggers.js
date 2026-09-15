// lib/notifications/triggers.js
//
// Two things live in this file:
//
//   1. notify() — ONE generic function that turns "this event just
//      happened" into real Notification rows, for ANY type registered
//      in lib/notifications/rules.js. This is what makes rules.js
//      actually DO something instead of just being documentation —
//      register a rule there, and notify() knows how to run it, for
//      every type, without a single new line of plumbing per type.
//
//   2. A small named wrapper per real-world event
//      (notifyProjectAssignment, notifyMilestoneAwaitingApproval, ...).
//      These exist ONLY to gather whatever notify() needs but the call
//      site doesn't already have on hand — almost always: looking up a
//      project's workspaceId from a projectId the caller DOES have. If
//      a future event's call site already has everything notify()
//      needs, you don't need a wrapper — just call notify() directly.
//
// ── THE FULL PROCESS FOR ADDING A NEW NOTIFICATION RULE ────────────────
//   1. lib/notifications/constants.js — add one line to NOTIFICATION_TYPES
//      (and, if it should render with its own icon, one entry to
//      NOTIFICATION_META).
//   2. schema.prisma — add the same value to the NotificationType enum,
//      then `npx prisma migrate dev`.
//   3. lib/notifications/rules.js — add one entry to NOTIFICATION_RULES.
//      This is where you decide WHO gets it and WHAT it says.
//   4. Call notify(YOUR_NEW_TYPE, payload, db) from wherever the real
//      event happens. Write a wrapper function in THIS file only if
//      that call site needs to look something up first.
// That's the whole process, every time. You never touch service.js,
// and you never hand-write a new createNotifications call.

import prisma from '../prisma.js'
import { createNotifications } from './service.js'
import { NOTIFICATION_TYPES } from './constants.js'
import { NOTIFICATION_RULES } from './rules.js'

// The generic dispatcher. Looks up the rule for `type` in the registry,
// resolves who should get it and what it should say, and hands the
// result to createNotifications() — which still does all the real work
// (the authorization check inside createNotification, the dedup-safe
// insert). This function adds no logic of its own beyond "read the
// rule, do exactly what it says."
export async function notify(type, payload, db = prisma) {
  const rule = NOTIFICATION_RULES[type]
  if (!rule) {
    // A programming error, not a runtime condition to swallow quietly —
    // it means a NOTIFICATION_TYPES value (or a typo'd string) was
    // passed to notify() with no matching entry in rules.js. Throwing
    // loudly here, at the moment it happens, is far better than
    // silently notifying nobody and wondering later why a feature
    // "doesn't work."
    throw new Error(`notify(): no rule registered for type "${type}" in lib/notifications/rules.js`)
  }

  const recipients = await rule.getRecipients(payload, db)
  if (!recipients || recipients.length === 0) return []

  const content = rule.buildContent(payload)
  const dedupeKey = rule.buildDedupeKey(payload)

  return createNotifications(
    recipients.map((userId) => ({
      userId,
      workspaceId: payload.workspaceId,
      type,
      dedupeKey,
      ...content,
    })),
    db
  )
}

// ── Named wrappers — one per real-world event ───────────────────────────

// Call this right after addProjectMember()'s upsert succeeds in
// lib/project.js.
export async function notifyProjectAssignment(
  { projectId, targetUserId, workspaceId, projectName, isNewAssignment },
  db = prisma
) {
  return notify(
    NOTIFICATION_TYPES.PROJECT_ASSIGNED,
    { projectId, targetUserId, workspaceId, projectName, isNewAssignment },
    db
  )
}

// Call this right after a milestone's status is set to IN_REVIEW.
// `milestone` needs at least { id, title, projectId }.
export async function notifyMilestoneAwaitingApproval(milestone, db = prisma) {
  const project = await db.project.findUnique({
    where: { id: milestone.projectId },
    select: { workspaceId: true },
  })
  if (!project) return [] // project vanished between the update and this call

  return notify(
    NOTIFICATION_TYPES.MILESTONE_APPROVAL_PENDING,
    { workspaceId: project.workspaceId, milestone },
    db
  )
}

// Call this right after createInvite() upserts a WorkspaceInvite row.
export async function notifyWorkspaceInvite(invite, workspaceName, db = prisma) {
  return notify(
    NOTIFICATION_TYPES.WORKSPACE_INVITE,
    { workspaceId: invite.workspaceId, invite, workspaceName },
    db
  )
}

// NEW — call this right after a MilestoneUpdate row is created.
// `milestone` needs at least { id, title, projectId }. This one
// function decides WHICH of the two related types actually fires,
// based on whether a file was attached — the call site doesn't need to
// know or care about that distinction, it always calls this same
// function the same way.
export async function notifyMilestoneUpdatePosted(milestoneUpdate, milestone, actorName, db = prisma) {
  const project = await db.project.findUnique({
    where: { id: milestone.projectId },
    select: { workspaceId: true },
  })
  if (!project) return []

  const type = milestoneUpdate.fileUrl
    ? NOTIFICATION_TYPES.MILESTONE_DELIVERABLE_UPLOADED
    : NOTIFICATION_TYPES.MILESTONE_UPDATE_POSTED

  return notify(
    type,
    { workspaceId: project.workspaceId, projectId: milestone.projectId, milestone, milestoneUpdate, actorName },
    db
  )
}

// NEW — call this right after a Task's status is set to DONE.
// NOT wired to a route yet — I don't have your task update route. Show
// it to me and this becomes a two-line addition, same as every other
// trigger so far: one import, one call, right after the status update
// saves.
export async function notifyTaskCompleted(task, projectId, actorName, db = prisma) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  })
  if (!project) return []

  return notify(
    NOTIFICATION_TYPES.TASK_COMPLETED,
    { workspaceId: project.workspaceId, projectId, task, actorName },
    db
  )
}

// NEW — call this right after a project Update row is created in
// POST /api/updates. `projectId` is already in scope at that call
// site (it's the request body's own field) — this wrapper's only job
// is resolving workspaceId and the project's name, neither of which
// that route otherwise needs to look up.
export async function notifyProjectUpdatePosted(update, projectId, actorName, db = prisma) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true, name: true },
  })
  if (!project) return []

  return notify(
    NOTIFICATION_TYPES.PROJECT_UPDATE_POSTED,
    { workspaceId: project.workspaceId, projectId, projectName: project.name, update, actorName },
    db
  )
}

// NEW — call this right after a File row is created by the
// project-level file upload route. Same shape as
// notifyProjectUpdatePosted right above — projectId is already in
// scope at that call site, this wrapper resolves workspaceId + name.
export async function notifyProjectFileUploaded(file, projectId, actorName, db = prisma) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true, name: true },
  })
  if (!project) return []

  return notify(
    NOTIFICATION_TYPES.PROJECT_FILE_UPLOADED,
    { workspaceId: project.workspaceId, projectId, projectName: project.name, file, actorName },
    db
  )
}