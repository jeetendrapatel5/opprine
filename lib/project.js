// lib/project.js
//
// Project access rule:
//   1. not in the project's workspace -> NotFoundError (404, never leak existence)
//   2. workspace OWNER/ADMIN (always full access), or assigned to the project -> allowed
//   3. workspace member but not assigned -> ForbiddenError (UI: "access restricted")

import prisma from './prisma.js'
import { NotFoundError, ForbiddenError } from './errors.js'
import { can } from './project-permissions.js'
import { notifyProjectAssignment } from './notifications/triggers.js'

// Workspace roles that open every project without an assignment.
// Keep ADMIN: staffing someone needs project access first.
export const IMPLICIT_ACCESS_ROLES = ['OWNER', 'ADMIN']

export const hasImplicitProjectAccess = (workspaceRole) =>
  IMPLICIT_ACCESS_ROLES.includes(workspaceRole)

// undefined in a prisma `where` means "no filter", so validate ids first
const isId = (value) => typeof value === 'string' && value.trim().length > 0

export async function requireProjectMembership(userId, projectId, db = prisma) {
  if (!isId(userId) || !isId(projectId)) {
    throw new NotFoundError('Project not found.')
  }

  // one round trip: project + my project role + my workspace role
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      members: { where: { userId }, select: { role: true }, take: 1 },
      workspace: {
        select: {
          members: { where: { userId }, select: { role: true }, take: 1 },
        },
      },
    },
  })
  if (!project) throw new NotFoundError('Project not found.')

  // workspace check first: removed members can still have stale ProjectMember rows
  const workspaceRole = project.workspace.members[0]?.role
  if (!workspaceRole) throw new NotFoundError('Project not found.')

  // owner/admin first: a ProjectMember row must never downgrade them
  // (creators get auto-staffed as PROJECT_MANAGER, even if they're the Owner)
  if (hasImplicitProjectAccess(workspaceRole)) {
    return { role: workspaceRole, implicit: true }
  }

  const projectRole = project.members[0]?.role
  if (projectRole) return { role: projectRole, implicit: false }

  throw new ForbiddenError('You are not assigned to this project.')
}

// For pages: returns a status instead of throwing, so no try/catch per page.
//   const access = await getProjectAccess(userId, id)
//   if (access.status === 'missing') notFound()
//   if (access.status === 'restricted') return <ProjectAccessRestricted />
export async function getProjectAccess(userId, projectId, db = prisma) {
  try {
    const { role, implicit } = await requireProjectMembership(userId, projectId, db)
    return { status: 'ok', role, implicit }
  } catch (err) {
    if (err instanceof ForbiddenError) return { status: 'restricted' }
    if (err instanceof NotFoundError) return { status: 'missing' }
    throw err // real bug, don't hide it
  }
}

export function requireProjectRole(role, allowedRoles) {
  if (!allowedRoles.includes(role)) {
    throw new ForbiddenError(
      `This action requires one of these project roles: ${allowedRoles.join(', ')}.`
    )
  }
}


export async function addProjectMember(
  { requestingUserId, targetUserId, projectId, role = 'CONTRIBUTOR' },
  db = prisma
) {
  if (!isId(targetUserId)) throw new NotFoundError('User not found.')

  const requesterMembership = await requireProjectMembership(requestingUserId, projectId, db)

  if (!can(requesterMembership.role, 'manageStaffing')) {
    throw new ForbiddenError('You do not have permission to manage staffing on this project.')
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true, name: true },
  })
  if (!project) {
    throw new NotFoundError('Project not found.')
  }

  const targetWorkspaceMembership = await db.workspaceMember.findFirst({
    where: { userId: targetUserId, workspaceId: project.workspaceId },
  })
  if (!targetWorkspaceMembership) {
    throw new ForbiddenError(
      'This person must be a member of the workspace before they can be staffed on a project in it.'
    )
  }

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

  const result = await db.projectMember.upsert({
    where: { projectId_userId: { projectId, userId: targetUserId } },
    update: { role },
    create: { projectId, userId: targetUserId, role },
  })

  await notifyProjectAssignment({
    projectId,
    targetUserId,
    workspaceId: project.workspaceId,
    projectName: project.name,
    isNewAssignment: !existingMembership,
  })

  return result
}

export async function removeProjectMember(
  { requestingUserId, targetUserId, projectId },
  db = prisma
) {
  // without this, a missing targetUserId would match (and remove) a random member
  if (!isId(targetUserId)) {
    throw new NotFoundError('This person is not staffed on this project.')
  }

  const requesterMembership = await requireProjectMembership(requestingUserId, projectId, db)

  if (!can(requesterMembership.role, 'manageStaffing')) {
    throw new ForbiddenError('You do not have permission to manage staffing on this project.')
  }

  const membership = await db.projectMember.findFirst({
    where: { userId: targetUserId, projectId },
  })
  if (!membership) {
    throw new NotFoundError('This person is not staffed on this project.')
  }

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

export async function listProjectMembersForPortal(projectId, db = prisma) {
  const members = await db.projectMember.findMany({
    where: { projectId },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { addedAt: 'asc' },
  })

  return members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    avatarUrl: m.user.avatarUrl,
    role: m.role,
  }))
}