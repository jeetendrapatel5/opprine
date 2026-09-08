// app/api/workspace/members/route.js
//
// GET — list every member of the caller's active workspace. Any
// member can view this (matches GET /api/workspace/invites: only
// sending/revoking is role-gated, not viewing) — no requireRole call.
//
// Sibling to app/api/workspace/members/[userId]/route.js (DELETE).
// That route only handles removal — no POST here either. Workspace
// membership is created through the invite flow (WorkspaceInvite ->
// acceptInvite), not by posting directly to this collection, so this
// file stays GET-only.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireWorkspaceMembership, listWorkspaceMembers } from '@/lib/workspace'
import { handleApiError } from '@/lib/http-errors'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const membership = await requireWorkspaceMembership(session.user.id)
    const members = await listWorkspaceMembers(membership.workspaceId)

    return NextResponse.json({ members })
  } catch (error) {
    return handleApiError(error)
  }
}