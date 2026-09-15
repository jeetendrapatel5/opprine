// lib/notifications/rules.js
//
// THIS is the file that answers "how do I define what gets notified to
// whom, without hardcoding everything." It's a REGISTRY — one plain
// object, one entry per notification TYPE — not a growing pile of
// if/else statements or a new hand-written function for every event.
//
// Each entry in NOTIFICATION_RULES says exactly three things:
//   1. getRecipients(payload, db) — WHO gets notified. Returns an
//      array of userIds (can be empty — that's a normal, valid answer,
//      not an error).
//   2. buildContent(payload)      — WHAT it says. Returns
//      { title, message, projectId?, metadata? }.
//   3. buildDedupeKey(payload)    — the key that stops the same
//      real-world event from creating two rows.
//
// `payload` is just a plain object — whatever the caller of notify()
// (see lib/notifications/triggers.js) hands in. Each rule below
// documents what it expects to find on it.
//
// ── HOW TO ADD A NEW RULE, going forward ─────────────────────────────
//   1. constants.js  — add one line to NOTIFICATION_TYPES
//   2. schema.prisma — add the same value to the NotificationType enum,
//                       then `npx prisma migrate dev`
//   3. THIS FILE     — add one entry to NOTIFICATION_RULES below,
//                       copying the shape of any existing one
//   4. Call site     — call notify(YOUR_TYPE, payload, db) from
//                       wherever the real event happens
// You never write a new createNotifications call, a new authorization
// check, or a new "loop over recipients" — notify() in triggers.js
// already does that generically, for every type registered here.

import { NOTIFICATION_TYPES } from './constants.js'

// ── Shared recipient resolvers ──────────────────────────────────────────
// Named after WHO they return, not after any one event — multiple rules
// below reuse this same resolver, because "the project's PMs" is the
// right answer to several different questions in this app, not just one.
// If a future rule needs a different audience (e.g. "every Contributor
// on the project," or "the client"), write a second small resolver next
// to this one rather than complicating this one with a parameter that
// changes its meaning.

// Everyone explicitly staffed as PROJECT_MANAGER on a project.
// Deliberately does NOT include implicit OWNER/ADMIN workspace access
// (see requireProjectMembership in lib/project.js) — implicit access is
// an AUTHORIZATION fallback, not a signal that someone tracks this
// project's day-to-day activity. If you want Owner/Admin included too,
// add a second query here for WorkspaceMember role IN ('OWNER','ADMIN')
// scoped to the project's workspace, and merge the two userId lists —
// that's a product decision, not something to bake in silently.
export async function projectManagers(projectId, db) {
  const pms = await db.projectMember.findMany({
    where: { projectId, role: 'PROJECT_MANAGER' },
    select: { userId: true },
  })
  return pms.map((m) => m.userId)
}

// Plain display labels for Update.status — kept local to this file
// since it's the only place that turns a status into human-readable
// text for a notification. Your frontend's own status labels/colors
// (UPDATE_STATUS in components/.../updateStatus.js) live in a
// client-only file with React icon components, which isn't something
// this server-side file can import — so this is a small, deliberate
// duplication of just the three label strings, not the icons/colors.
const STATUS_LABELS = {
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
}

// ── The registry ─────────────────────────────────────────────────────

export const NOTIFICATION_RULES = {
  // payload: { projectId, targetUserId, workspaceId, projectName, isNewAssignment }
  [NOTIFICATION_TYPES.PROJECT_ASSIGNED]: {
    // Only a genuinely NEW staffing notifies — a role change on someone
    // already on the project returns no recipients at all, which
    // notify() treats as "nothing to do," not an error.
    getRecipients: (payload) => (payload.isNewAssignment ? [payload.targetUserId] : []),
    buildContent: (payload) => ({
      title: 'Project assignment',
      message: `You were added to the ${payload.projectName} project`,
      projectId: payload.projectId,
      metadata: { projectName: payload.projectName },
    }),
    buildDedupeKey: (payload) => `PROJECT_ASSIGNED:${payload.projectId}:${payload.targetUserId}`,
  },

  // payload: { workspaceId, milestone } — milestone needs { id, title, projectId }
  [NOTIFICATION_TYPES.MILESTONE_APPROVAL_PENDING]: {
    getRecipients: (payload, db) => projectManagers(payload.milestone.projectId, db),
    buildContent: (payload) => ({
      title: 'Milestone awaiting approval',
      message: `${payload.milestone.title} is waiting for client approval`,
      projectId: payload.milestone.projectId,
      metadata: { milestoneId: payload.milestone.id, milestoneTitle: payload.milestone.title },
    }),
    buildDedupeKey: (payload) => `MILESTONE_APPROVAL_PENDING:${payload.milestone.id}`,
  },

  // payload: { workspaceId, invite, workspaceName } — invite needs { id, email, token }
  [NOTIFICATION_TYPES.WORKSPACE_INVITE]: {
    // Invites are sent to an EMAIL, not a userId — only notify if an
    // account with that email already exists.
    getRecipients: async (payload, db) => {
      const user = await db.user.findUnique({
        where: { email: payload.invite.email },
        select: { id: true },
      })
      return user ? [user.id] : []
    },
    buildContent: (payload) => ({
      title: 'Workspace invitation',
      message: `You have been invited to join ${payload.workspaceName}`,
      metadata: { inviteId: payload.invite.id, inviteToken: payload.invite.token },
    }),
    buildDedupeKey: (payload) => `WORKSPACE_INVITE:${payload.invite.id}`,
  },

  // ── New rules — exactly what "adding a rule" looks like day to day ───
  // All three below share the same recipients (projectManagers) and the
  // same payload shape. Once the generic plumbing exists, most new
  // rules are this short — a getRecipients call, a template string, and
  // a dedupe key.

  // payload: { workspaceId, projectId, milestone, milestoneUpdate, actorName }
  [NOTIFICATION_TYPES.MILESTONE_UPDATE_POSTED]: {
    getRecipients: (payload, db) => projectManagers(payload.projectId, db),
    buildContent: (payload) => ({
      title: 'New update posted',
      message: `${payload.actorName ?? 'A team member'} posted an update on ${payload.milestone.title}`,
      projectId: payload.projectId,
      metadata: { milestoneId: payload.milestone.id, milestoneUpdateId: payload.milestoneUpdate.id },
    }),
    buildDedupeKey: (payload) => `MILESTONE_UPDATE_POSTED:${payload.milestoneUpdate.id}`,
  },

  // payload: same shape as MILESTONE_UPDATE_POSTED above — see
  // notifyMilestoneUpdatePosted() in triggers.js for how ONE call site
  // ends up firing whichever of these two types actually applies.
  [NOTIFICATION_TYPES.MILESTONE_DELIVERABLE_UPLOADED]: {
    getRecipients: (payload, db) => projectManagers(payload.projectId, db),
    buildContent: (payload) => ({
      title: 'New deliverable uploaded',
      message: `${payload.actorName ?? 'A team member'} uploaded a file to ${payload.milestone.title}`,
      projectId: payload.projectId,
      metadata: {
        milestoneId: payload.milestone.id,
        milestoneUpdateId: payload.milestoneUpdate.id,
        fileName: payload.milestoneUpdate.fileName,
      },
    }),
    buildDedupeKey: (payload) => `MILESTONE_DELIVERABLE_UPLOADED:${payload.milestoneUpdate.id}`,
  },

  // payload: { workspaceId, projectId, task, actorName } — task needs { id, title }
  [NOTIFICATION_TYPES.TASK_COMPLETED]: {
    getRecipients: (payload, db) => projectManagers(payload.projectId, db),
    buildContent: (payload) => ({
      title: 'Task completed',
      message: `${payload.actorName ?? 'A team member'} completed "${payload.task.title}"`,
      projectId: payload.projectId,
      metadata: { taskId: payload.task.id, taskTitle: payload.task.title },
    }),
    // CAVEAT worth knowing, same shape as the milestone-approval one:
    // your Task model has no `completedAt` column, so this key is
    // scoped to the task only. Reopening a task and completing it a
    // SECOND time will NOT notify again — the first notification row
    // already exists under this exact key. The clean fix, if you want
    // re-completion to notify, is adding `completedAt DateTime?` to
    // Task (mirroring what Milestone already has) and folding it into
    // this key — a schema change, so I'm flagging it instead of making
    // it for you.
    buildDedupeKey: (payload) => `TASK_COMPLETED:${payload.task.id}`,
  },

  // payload: { workspaceId, projectId, projectName, update, actorName }
  // update needs { id, text, status }
  [NOTIFICATION_TYPES.PROJECT_UPDATE_POSTED]: {
    getRecipients: (payload, db) => projectManagers(payload.projectId, db),
    buildContent: (payload) => {
      // "With all the details" — the notification carries the FULL
      // update text and status in `metadata` (for a future expanded
      // view, or if you want NotificationItem to show more than one
      // line), while `message` itself is a truncated preview so the
      // dropdown row doesn't blow up to five lines for a long update.
      // 120 chars is roughly two lines at the dropdown's current width
      // — adjust the number if that reads too short or too long once
      // you see it rendered.
      const preview =
        payload.update.text.length > 120 ? `${payload.update.text.slice(0, 117)}...` : payload.update.text

      return {
        title: 'New project update',
        message: `${payload.actorName ?? 'A team member'} posted an update on ${payload.projectName} (${
          STATUS_LABELS[payload.update.status] ?? payload.update.status
        }): "${preview}"`,
        projectId: payload.projectId,
        metadata: {
          updateId: payload.update.id,
          status: payload.update.status,
          text: payload.update.text, // full, untruncated text
        },
      }
    },
    // Each POST to /api/updates always creates a brand-new Update row
    // (no upsert, unlike invites) — so a fresh id every time is already
    // exactly the right dedupe scope: two genuinely different updates
    // always notify, and a retried request that somehow created two DB
    // rows would (correctly) produce two notifications too, matching
    // the two rows that actually exist. Nothing more to dedupe here.
    buildDedupeKey: (payload) => `PROJECT_UPDATE_POSTED:${payload.update.id}`,
  },

  // payload: { workspaceId, projectId, projectName, file, actorName }
  // file needs { id, name } — this is a row from the `File` model
  // (project-level uploads), NOT a MilestoneUpdate — see the note in
  // the schema addition for why these have separate types.
  [NOTIFICATION_TYPES.PROJECT_FILE_UPLOADED]: {
    getRecipients: (payload, db) => projectManagers(payload.projectId, db),
    buildContent: (payload) => ({
      title: 'New file uploaded',
      message: `${payload.actorName ?? 'A team member'} uploaded ${payload.file.name} to ${payload.projectName}`,
      projectId: payload.projectId,
      metadata: { fileId: payload.file.id, fileName: payload.file.name },
    }),
    // Same reasoning as PROJECT_UPDATE_POSTED: every upload creates a
    // brand-new File row (no upsert), so the row's own id is already
    // exactly the right dedupe scope.
    buildDedupeKey: (payload) => `PROJECT_FILE_UPLOADED:${payload.file.id}`,
  },
}