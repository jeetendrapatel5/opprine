// app/api/workspace/list/route.js
//
// GET — every workspace the logged-in user belongs to, with their role
// in each and which one is currently active. Powers
// WorkspaceSwitcherDropdown.jsx.
//
// Kept separate from GET /api/workspace on purpose: that route returns
// DEEP detail (entitlements, full member list) for the ONE active
// workspace. This route returns a SHALLOW list of ALL workspaces, for a
// completely different UI (a dropdown, not a dashboard). Merging them
// would mean the sidebar — which renders on every single page — paying
// for entitlements and member-list data it never uses just to get a
// name+role list.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listWorkspacesForUser } from '@/lib/workspace'
import { handleApiError } from '@/lib/http-errors'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaces = await listWorkspacesForUser(session.user.id)

    return NextResponse.json({ workspaces })
  } catch (error) {
    return handleApiError(error)
  }
}