// app/api/workspace/switch/route.js
//
// POST — change which workspace is "active" for the logged-in user
// (e.g. picking a different one from a future workspace-switcher
// dropdown).
//
// Body: { workspaceId: string }
//
// Returns a MINIMAL confirmation — { workspaceId, role } — not the
// full workspace picture (entitlements, member list, project counts,
// etc). That's deliberate: GET /api/workspace already owns the job of
// returning the full picture. If this route also returned all of that,
// two routes would be maintaining the same response shape, and they'd
// eventually drift out of sync (one gets a new field added, the other
// doesn't). The frontend's job after a successful switch is simple:
// call GET /api/workspace again to refresh everything else.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { switchActiveWorkspace } from '@/lib/workspace'
import { handleApiError } from '@/lib/http-errors'

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const workspaceId = typeof body?.workspaceId === 'string' ? body.workspaceId.trim() : ''
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    // switchActiveWorkspace (lib/workspace.js) throws ForbiddenError if
    // the user isn't actually a member of this workspace — someone
    // trying to switch into a workspace they don't belong to, whether
    // by a UI bug or a deliberately crafted request. handleApiError
    // turns that into a 403, same as every other route using this
    // error class.
    const result = await switchActiveWorkspace(session.user.id, workspaceId)

    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}