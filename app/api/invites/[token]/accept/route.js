// app/api/invites/[token]/accept/route.js
//
// POST — the actual join. REQUIRES a logged-in session, because
// acceptInvite needs a real userId to create the WorkspaceMember row.
//
// If someone hits this while logged out, the right frontend behavior
// is: never let them get here in the first place. The accept page
// should check GET /api/invites/[token] first, and if there's no
// session, send them to sign up / log in BEFORE showing an "Accept"
// button that would just hit this route and 401.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { acceptInvite } from '@/lib/invites'
import { handleApiError } from '@/lib/http-errors'

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'You must be logged in to accept this invite' },
        { status: 401 }
      )
    }

    const { token } = await params

    // acceptInvite (lib/invites.js) does everything else: re-validates
    // the token under an advisory lock, checks the seat limit
    // authoritatively, creates the WorkspaceMember with the invite's
    // role, marks the invite ACCEPTED, and switches activeWorkspaceId.
    const result = await acceptInvite(token, session.user.id)

    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}