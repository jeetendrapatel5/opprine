// app/api/projects/[id]/members/route.js
//
// POST — staff a user onto this project (or change their role if
// they're already staffed — addProjectMember upserts). PROJECT_MANAGER
// only, same authority level as milestone create/edit.
//
// GET — list everyone staffed on this project. Any staffed member can
// view this (matches GET /api/workspace/invites: only sending/revoking
// is role-gated, not viewing) — no requireProjectRole call.
//
// Shape mirrors app/api/workspace/invites/route.js, with one structural
// difference: addProjectMember (lib/project.js) already does its OWN
// requester-permission check internally — createInvite doesn't, which
// is why the invites route calls requireRole itself before handing
// off. Here, POST doesn't duplicate that check — addProjectMember
// throws ForbiddenError itself if the caller isn't PROJECT_MANAGER-or-
// above, same "don't trust the caller already checked" discipline it
// documents about itself. GET still needs its own requireProjectMembership
// call though — listProjectMembers explicitly does NOT check permission
// itself (see the comment on it in lib/project.js).

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireProjectMembership, addProjectMember, listProjectMembers } from '@/lib/project'
import { handleApiError } from '@/lib/http-errors'

// The three ProjectRole values — unlike WorkspaceRole's OWNER (which
// invites deliberately exclude), none of these need excluding here.
// A PROJECT_MANAGER staffing another PROJECT_MANAGER, a CONTRIBUTOR,
// or a read-only VIEWER are all legitimate. This just guards against
// a typo'd or garbage role string reaching Prisma as a raw enum value.
const STAFFABLE_ROLES = ['PROJECT_MANAGER', 'CONTRIBUTOR', 'VIEWER']

export async function POST(request, { params }) {
  try {
    // Step 1 — must be logged in
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const { id: projectId } = await params

    // Step 2 — read + validate the request body. Basic shape/presence
    // checks return 400 directly, same convention as
    // app/api/workspace/invites/route.js — reserved for things that
    // depend on database state (membership, roles) below.
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const userId = typeof body?.userId === 'string' ? body.userId.trim() : ''
    const role = typeof body?.role === 'string' ? body.role.trim().toUpperCase() : 'CONTRIBUTOR'

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    if (!STAFFABLE_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Role must be one of: ${STAFFABLE_ROLES.join(', ')}` },
        { status: 400 }
      )
    }

    // Step 3 — hand off. addProjectMember checks the caller's own
    // PROJECT_MANAGER-or-above access, confirms the target is already
    // a WorkspaceMember of this project's workspace, and upserts —
    // all inside lib/project.js. Throws ForbiddenError/NotFoundError
    // as appropriate, both handled by handleApiError below.
    const member = await addProjectMember({
      requestingUserId: session.user.id,
      targetUserId: userId,
      projectId,
      role,
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const { id: projectId } = await params

    // listProjectMembers itself has no permission check — the "who's
    // allowed to view" decision lives here in the route, same as GET
    // /api/workspace/invites calling requireWorkspaceMembership without
    // a follow-up requireRole. No role check: any staffed member (or
    // implicit OWNER/ADMIN) can see who else is on the project.
    await requireProjectMembership(session.user.id, projectId)

    const members = await listProjectMembers(projectId)

    return NextResponse.json({ members })
  } catch (error) {
    return handleApiError(error)
  }
}