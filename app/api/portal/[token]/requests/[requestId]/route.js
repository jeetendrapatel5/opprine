// app/api/portal/[token]/requests/[requestId]/route.js
//
//   POST /api/portal/:token/requests/:requestId
//
// The client answers ONE request. Body depends on the request's type (the
// type is read from the database, never from the body):
//
//   TEXT      { "answerText": "Our brand colours are ..." }
//   APPROVAL  { "approved": true }
//             { "approved": false, "answerText": "Please use the blue one" }
//
// What happens, in order (all inside lib/client-requests.js):
//   1. token -> client -> project            (bad token = 404)
//   2. request must be in THAT project       (otherwise 404)
//   3. request must still be OPEN            (already answered = 409)
//   4. body is validated for the type        (bad body = 400)
//   5. ONE conditional update OPEN -> SUBMITTED (a double-click loses = 409)
//   6. the team is notified (in-app + email); these can never fail the answer
//
// Rate limited per IP and per link (lib/portal-rate-limit.js). On top of that,
// the state machine means each request can be answered exactly once.

import { NextResponse } from 'next/server'
import { handleApiError } from '@/lib/http-errors'
import { portalRateLimit } from '@/lib/portal-rate-limit'
import { readJsonBody } from '@/lib/client-request-validation'
import { submitPortalRequest } from '@/lib/client-requests'

export async function POST(request, { params }) {
  try {
    const { token, requestId } = await params

    // Brake on hammering and token guessing (best effort, see lib/portal-rate-limit.js).
    const limited = portalRateLimit(request, token, { scope: 'answer', perIp: 30, perLink: 20 })
    if (limited) return limited

    const input = await readJsonBody(request)
    const updated = await submitPortalRequest({ token, requestId, input })
    return NextResponse.json(updated, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return handleApiError(error)
  }
}