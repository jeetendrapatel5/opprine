// app/api/workspace/route.js
//
// GET — returns everything a workspace-aware frontend needs in one call:
//   - basic workspace info (id, name)
//   - the calling user's role in it
//   - full member list (foundation for a future "manage team" page)
//   - entitlements (plan, usage vs limits, feature flags — foundation
//     for upgrade prompts and usage bars)
//
// POST — creates an ADDITIONAL workspace for the calling user (they
// already have at least one — this is for "I want a second one").
// Thin wrapper around createWorkspaceForUser, which does the actual
// work: makes the Workspace row, makes the caller OWNER, sets it active.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  requireWorkspaceMembership,
  listWorkspaceMembers,
  createWorkspaceForUser,
} from '@/lib/workspace'
import { getEntitlements } from '@/lib/billing/entitlements'
import { handleApiError } from '@/lib/http-errors'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const membership = await requireWorkspaceMembership(session.user.id)

    const [members, entitlements] = await Promise.all([
      listWorkspaceMembers(membership.workspaceId),
      getEntitlements(membership.workspaceId),
    ])

    return NextResponse.json({
      workspace: {
        id: membership.workspace.id,
        name: membership.workspace.name,
      },
      yourRole: membership.role,
      members,
      entitlements,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const name = typeof body.name === 'string' ? body.name.trim() : ''

    if (!name) {
      return NextResponse.json({ error: 'Workspace name is required.' }, { status: 400 })
    }

    const workspace = await createWorkspaceForUser(session.user.id, { name })

    return NextResponse.json({ workspace })
  } catch (error) {
    return handleApiError(error)
  }
}