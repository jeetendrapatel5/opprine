// app/api/projects/[id]/route.js  (DELETE)

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { requireWorkspaceMembership } from '@/lib/workspace'
import { can } from '@/lib/project-permissions'
import { NotFoundError, ForbiddenError } from '@/lib/errors'
import { handleApiError } from '@/lib/http-errors'

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Authorize by workspace membership + the permission matrix, not
    // by `userId === session.user.id`. Same requireWorkspaceMembership
    // function every other billing-adjacent route uses.
    //
    // CHANGED: was requireRole(membership.role, ['OWNER', 'ADMIN']).
    // Same idea, now routed through can() instead of a raw role
    // array — this is the 'deleteProject' row of the matrix, which is
    // the ONE place Owner/Admin and PM genuinely diverge (PM can do
    // almost everything else Owner/Admin can, but not this). Since
    // `membership.role` here is a WorkspaceRole ('OWNER'/'ADMIN'/'MEMBER'),
    // can() maps OWNER/ADMIN to the OWNER_OR_ADMIN tier and MEMBER
    // falls through to "no access" — same effective behavior as
    // before, just centralized instead of hardcoded here.
    const membership = await requireWorkspaceMembership(session.user.id)
    if (!can(membership.role, 'deleteProject')) {
      throw new ForbiddenError('You do not have permission to delete this project.')
    }

    // Ownership check is workspace-scoped instead of user-scoped —
    // any project belonging to a workspace this person has the right
    // role in, regardless of who personally created it.
    const project = await prisma.project.findFirst({
      where: { id, workspaceId: membership.workspaceId },
      select: { id: true },
    })

    if (!project) {
      throw new NotFoundError('Project not found.')
    }

    // Postgres cascades everything (File, Client, Update, Milestone,
    // Inquiry, Invoice all have onDelete: Cascade back to Project in
    // schema.prisma).
    await prisma.project.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}