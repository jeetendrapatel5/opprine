// app/api/invites/[token]/route.js
//
// GET — PUBLIC. Deliberately no session check — the person clicking
// this link may not have an account yet, which is the whole point of
// an invite. Returns just enough for the accept page to decide what to
// render.
//
// Status codes:
//   200 — token matches a real invite. Check the `status` field in the
//         body: 'PENDING' means it can still be accepted; 'EXPIRED',
//         'REVOKED', or 'ACCEPTED' mean it can't, and the frontend
//         should show a specific message for each rather than a
//         generic error — see getInviteByToken in lib/invites.js.
//   404 — token matches NO invite at all (typo'd link, or garbage).
//         This is the only case that's genuinely "not found."

import { NextResponse } from 'next/server'
import { getInviteByToken } from '@/lib/invites'
import { handleApiError } from '@/lib/http-errors'

export async function GET(request, { params }) {
  try {
    const { token } = await params

    const invite = await getInviteByToken(token)

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    return NextResponse.json(invite)
  } catch (error) {
    return handleApiError(error)
  }
}