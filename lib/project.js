// lib/project.js
import prisma from './prisma.js'
import { NotFoundError, ForbiddenError } from './errors.js'
import { can } from './project-permissions.js'
import { notifyProjectAssignment } from './notifications/triggers.js'

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