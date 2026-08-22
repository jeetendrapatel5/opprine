import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { requireWorkspaceMembership, requireRole } from '@/lib/workspace'
import { NotFoundError } from '@/lib/errors'
import { handleApiError } from '@/lib/http-errors'

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // THE FIX: authorize by workspace membership + role, not by
    // `userId === session.user.id`. Same requireWorkspaceMembership /
    // requireRole functions every other billing-adjacent route already
    // uses (see cancel/route.js, checkout/route.js) — no new pattern
    // invented here.
    //
    // Role choice: deleting a project is destructive and irreversible,
    // so this is gated the same tier as billing actions — OWNER or
    // ADMIN, MEMBER blocked. That was my proposed default; tell me if
    // you want it looser (any member) or tighter (OWNER only).
    const membership = await requireWorkspaceMembership(session.user.id)
    requireRole(membership.role, ['OWNER', 'ADMIN'])

    // Ownership check is now workspace-scoped instead of user-scoped.
    // This is the actual bug the old check had: once invite-teammate
    // ships, an ADMIN would not have been able to delete a project a
    // teammate created, because `userId` only ever matched the
    // project's original creator — never anyone else in the same
    // workspace. Scoping to workspaceId instead means "any project
    // that belongs to a workspace this person has the right role in,"
    // regardless of who personally created it.
    const project = await prisma.project.findFirst({
      where: { id, workspaceId: membership.workspaceId },
      select: { id: true },
    })

    if (!project) {
      throw new NotFoundError('Project not found.')
    }

    // Unchanged — still one line, Postgres still cascades everything
    // (File, Client, Update, Milestone, Inquiry, Invoice all have
    // onDelete: Cascade back to Project in schema.prisma).
    await prisma.project.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    // Matches cancel/route.js and checkout/route.js — neither of those
    // calls console.error itself before handleApiError, so I'm assuming
    // handleApiError already logs unexpected errors internally. If it
    // doesn't and you were relying on this file's own console.error for
    // visibility into failures, let me know and I'll add it back.
    return handleApiError(error)
  }
}