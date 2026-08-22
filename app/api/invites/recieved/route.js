// app/api/invites/received/route.js
//
// GET — pending invites addressed TO the logged-in user's email,
// across every workspace, not just their currently active one.
//
// SECURITY: the email used for this lookup comes from
// session.user.email — the authenticated session — and NOWHERE ELSE.
// Never accept an email as a query param or body field here. This
// route is what makes listReceivedInvites' token-returning behavior
// safe (see the comment on that function in lib/invites.js) — that
// safety depends entirely on this route never letting anyone ask for
// invites addressed to an email that isn't provably their own.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listReceivedInvites } from '@/lib/invites'
import { handleApiError } from '@/lib/http-errors'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invites = await listReceivedInvites(session.user.email)

    return NextResponse.json({ invites })
  } catch (error) {
    return handleApiError(error)
  }
}