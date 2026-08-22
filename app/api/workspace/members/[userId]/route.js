// app/api/workspace/members/[userId]/route.js
//
// DELETE — remove a member from the caller's active workspace.
//
// The base role check here (OWNER/ADMIN) is just a fast-fail — the
// REAL, fine-grained permission check (can THIS role remove THAT
// specific target's role) happens inside removeMember, because it
// needs the target's role too, which isn't known until after a DB
// lookup this route doesn't need to duplicate.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireWorkspaceMembership, requireRole, removeMember } from '@/lib/workspace'
import { handleApiError } from '@/lib/http-errors'

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await params

    const membership = await requireWorkspaceMembership(session.user.id)
    requireRole(membership.role, ['OWNER', 'ADMIN'])

    await removeMember(userId, membership.workspaceId, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}