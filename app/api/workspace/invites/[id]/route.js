// app/api/workspace/invites/[id]/route.js
//
// DELETE — revoke a pending invite. OWNER/ADMIN only.
//
// Shape matches DELETE /api/projects/[id]/route.js on purpose: auth
// check, role check, then hand off to the lib function that does the
// real work. revokeInvite (lib/invites.js) already scopes its lookup
// by BOTH id AND workspaceId together, so this route doesn't need a
// separate "does this invite even belong to my workspace" check of its
// own — that protection lives in one place, not duplicated here.
//
// Same reasoning as the project-delete route for who can act: any
// OWNER or ADMIN can revoke ANY pending invite in the workspace,
// regardless of which specific OWNER/ADMIN originally sent it — not
// scoped to "only the person who sent it."

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireWorkspaceMembership, requireRole } from '@/lib/workspace'
import { revokeInvite } from '@/lib/invites'
import { handleApiError } from '@/lib/http-errors'

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const membership = await requireWorkspaceMembership(session.user.id)
    requireRole(membership.role, ['OWNER', 'ADMIN'])

    // revokeInvite throws NotFoundError if no PENDING invite with this
    // id exists in this workspace (wrong id, wrong workspace, or it was
    // already accepted/revoked) — handleApiError turns that into a 404
    // automatically, same as everywhere else this error class is used.
    await revokeInvite(id, membership.workspaceId)

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}