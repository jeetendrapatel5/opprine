// lib/project.js
//
// Project-level staffing and authorization. Companion file to
// lib/workspace.js — that file answers "which workspace, what role
// there." This file answers "is this user staffed on THIS project,
// and what can they do here."
//
// Two axes, on purpose, never merged into one:
//   WorkspaceRole (workspace.js) = what can this person do to the
//     AGENCY — billing, inviting members, deleting projects.
//   ProjectRole (this file)      = what can this person do on ONE
//     SPECIFIC client engagement they're staffed on.
//
// An OWNER or ADMIN of the workspace can act on any project in it
// even without an explicit ProjectMember row — see
// requireProjectMembership below for exactly how that fallback works.

import prisma from './prisma.js'
import { NotFoundError, ForbiddenError } from './errors.js'
import { can } from './project-permissions.js'

// Returns the caller's effective project membership, or throws.
//
// Step-by-step:
//   1. Look for a real ProjectMember row — the normal case for anyone
//      actually staffed on this project.
//   2. If none exists, don't fail immediately — check whether this
//      user is OWNER or ADMIN of the WORKSPACE this project belongs
//      to. Those two roles get implicit access to every project in
//      their workspace, same as they already do in workspace.js.
//   3. If neither check passes, this user genuinely has no business
//      here — throw ForbiddenError.
//
// Returns { role, implicit }. `implicit: true` on the OWNER/ADMIN
// fallback path, so the UI can show something like "you have
// oversight access" instead of pretending they were staffed like
// everyone else.
//
// CHANGED: the implicit fallback used to hardcode `role: 'PROJECT_MANAGER'`.
// It now returns the person's REAL workspace role ('OWNER' or 'ADMIN')
// instead. Why this changed: the new permission matrix in
// lib/project-permissions.js gives Owner/Admin some things a real PM
// doesn't have (delete the project, publish the showcase, delete a
// client, create invoices). If this function kept collapsing them
// into 'PROJECT_MANAGER', can() would have no way to tell the
// difference — an Owner using implicit access would be silently
// capped at PM-level permissions everywhere, including being UNABLE
// to delete their own project.
//
// THIS IS A BREAKING CHANGE for any code that still does
// `role === 'PROJECT_MANAGER'` or `requireProjectRole(role, ['PROJECT_MANAGER'])`
// to check for implicit Owner/Admin access — that check now returns
// false for them, where it used to return true. Every route in THIS
// session has been updated to call can() instead (which handles both
// 'PROJECT_MANAGER' and 'OWNER'/'ADMIN' correctly). If there's other
// code you haven't shown me yet that still compares against
// 'PROJECT_MANAGER' directly, it will break — grep for
// `'PROJECT_MANAGER'` across the codebase before shipping this.
export async function requireProjectMembership(userId, projectId, db = prisma) {
  const membership = await db.projectMember.findFirst({
    where: { userId, projectId },
  })
  if (membership) {
    return { role: membership.role, implicit: false }
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  })
  if (!project) {
    throw new NotFoundError('Project not found.')
  }

  const workspaceMembership = await db.workspaceMember.findFirst({
    where: { userId, workspaceId: project.workspaceId },
  })
  if (workspaceMembership && ['OWNER', 'ADMIN'].includes(workspaceMembership.role)) {
    return { role: workspaceMembership.role, implicit: true }
  }

  throw new ForbiddenError('You do not have access to this project.')
}

// Throws ForbiddenError if `role` isn't one of `allowedRoles`. Mirrors
// requireRole() in workspace.js exactly — same shape, same reasoning,
// just checking the other axis.
//
// STILL HERE, but no longer used anywhere in THIS file — everything
// below now goes through can() instead, per the "one file decides"
// rule the new lib/project-permissions.js establishes. Kept exported
// in case other code you haven't shown me still imports it directly;
// if nothing else uses it after you've updated your other routes,
// it's safe to delete.
export function requireProjectRole(role, allowedRoles) {
  if (!allowedRoles.includes(role)) {
    throw new ForbiddenError(
      `This action requires one of these project roles: ${allowedRoles.join(', ')}.`
    )
  }
}

// Staffs a user onto a project, or changes their role if they're
// already staffed (upsert). Only someone who can 'manageStaffing' —
// PROJECT_MANAGER, or an OWNER/ADMIN using implicit access — can do
// this, checked directly here, not just assumed from the calling
// route. Same defense-in-depth discipline removeMember() documents in
// workspace.js: don't trust the caller already checked.
export async function addProjectMember(
  { requestingUserId, targetUserId, projectId, role = 'CONTRIBUTOR' },
  db = prisma
) {
  const requesterMembership = await requireProjectMembership(requestingUserId, projectId, db)

  // CHANGED: was requireProjectRole(requesterMembership.role, ['PROJECT_MANAGER']).
  // That worked before only because the implicit-access fallback used
  // to hardcode 'PROJECT_MANAGER'. Now that it returns the real
  // 'OWNER'/'ADMIN' role (see the big comment on requireProjectMembership
  // above), a plain equality check against 'PROJECT_MANAGER' would
  // incorrectly block a real Owner/Admin from staffing people. can()
  // knows both PROJECT_MANAGER and OWNER_OR_ADMIN satisfy
  // 'manageStaffing' — a raw string compare doesn't.
  if (!can(requesterMembership.role, 'manageStaffing')) {
    throw new ForbiddenError('You do not have permission to manage staffing on this project.')
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  })
  if (!project) {
    throw new NotFoundError('Project not found.')
  }

  // The one check that can't live in the schema: the target user must
  // ALREADY be a WorkspaceMember of the project's workspace. Nothing in
  // Prisma can express "this foreign key is only valid if that other
  // foreign key's target exists elsewhere" — so this function checks it
  // directly, the same way switchActiveWorkspace() in workspace.js
  // checks membership before acting instead of trusting the input.
  const targetWorkspaceMembership = await db.workspaceMember.findFirst({
    where: { userId: targetUserId, workspaceId: project.workspaceId },
  })
  if (!targetWorkspaceMembership) {
    throw new ForbiddenError(
      'This person must be a member of the workspace before they can be staffed on a project in it.'
    )
  }

  // NEW — "last PM standing" guard (demotion case). If the target is
  // CURRENTLY the project's only PROJECT_MANAGER, and this call would
  // change them to something else (CONTRIBUTOR, VIEWER), block it.
  // Re-confirming an existing PM's role (role stays 'PROJECT_MANAGER'),
  // or promoting a non-PM, never triggers this — only an actual
  // demotion of the last PM does.
  //
  // NOTE: this is the simpler half of your recommendation. I did NOT
  // build the "...unless a replacement is named in the same action"
  // part — that needs a new request shape (accepting a second
  // user+role to promote atomically) and a matching frontend flow.
  // For now the workaround is two steps: promote someone else to PM
  // first, then demote/remove the original — this guard still allows
  // that, since by the second step there's already another PM.
  const existingMembership = await db.projectMember.findFirst({
    where: { projectId, userId: targetUserId },
  })
  if (existingMembership?.role === 'PROJECT_MANAGER' && role !== 'PROJECT_MANAGER') {
    const otherPMs = await db.projectMember.count({
      where: { projectId, role: 'PROJECT_MANAGER', userId: { not: targetUserId } },
    })
    if (otherPMs === 0) {
      throw new ForbiddenError(
        'This is the only Project Manager on this project. Promote someone else to Project Manager first.'
      )
    }
  }

  // upsert, not create — re-adding someone previously removed, or
  // changing their role, should update the existing row rather than
  // throw on the @@unique([projectId, userId]) constraint. Same
  // pattern createInvite() already uses for WorkspaceInvite.
  return db.projectMember.upsert({
    where: { projectId_userId: { projectId, userId: targetUserId } },
    update: { role },
    create: { projectId, userId: targetUserId, role },
  })
}

// Removes a user's staffing on a project. Does NOT touch their
// WorkspaceMember row — being taken off one project doesn't remove
// them from the agency, same separation of concerns as the rest of
// this file. Same 'manageStaffing' gate as addProjectMember.
export async function removeProjectMember(
  { requestingUserId, targetUserId, projectId },
  db = prisma
) {
  const requesterMembership = await requireProjectMembership(requestingUserId, projectId, db)

  // CHANGED — same reason as addProjectMember above.
  if (!can(requesterMembership.role, 'manageStaffing')) {
    throw new ForbiddenError('You do not have permission to manage staffing on this project.')
  }

  const membership = await db.projectMember.findFirst({
    where: { userId: targetUserId, projectId },
  })
  if (!membership) {
    throw new NotFoundError('This person is not staffed on this project.')
  }

  // NEW — "last PM standing" guard (removal case). Same rule as the
  // demotion check in addProjectMember, applied to outright removal.
  if (membership.role === 'PROJECT_MANAGER') {
    const otherPMs = await db.projectMember.count({
      where: { projectId, role: 'PROJECT_MANAGER', userId: { not: targetUserId } },
    })
    if (otherPMs === 0) {
      throw new ForbiddenError(
        'This is the only Project Manager on this project. Promote someone else to Project Manager before removing this person.'
      )
    }
  }

  // NEW (edge case 2 from the brief) — un-staffing someone used to
  // leave any Task.assignedToId rows pointing at a user no longer on
  // the project. Harmless today (nothing reads "my assigned tasks"
  // yet), but fixed now while this code is already open, so the data
  // stays honest independent of any future display logic.
  //
  // Task has no direct projectId column — only milestoneId — so
  // reaching "tasks on this project" means filtering through the
  // Milestone relation: `milestone: { projectId }`.
  //
  // Wrapped in a transaction so the unstaff and the cleanup either
  // both happen or neither does — no in-between state where the
  // ProjectMember row is gone but a stale assignment remains, or vice
  // versa.
  await db.$transaction([
    db.task.updateMany({
      where: {
        assignedToId: targetUserId,
        milestone: { projectId },
      },
      data: { assignedToId: null },
    }),
    db.projectMember.delete({ where: { id: membership.id } }),
  ])

  return { removed: true, userId: targetUserId, projectId }
}

// Returns everyone staffed on a project, with their project role —
// the data a "who's on this project" panel needs to render. No role
// gate on this one — anyone who already passed requireProjectMembership
// to reach the page can see who else is on it (matches viewRoster:
// true for every tier in lib/project-permissions.js).
export async function listProjectMembers(projectId, db = prisma) {
  const members = await db.projectMember.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { addedAt: 'asc' },
  })

  return members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    addedAt: m.addedAt,
  }))
}
