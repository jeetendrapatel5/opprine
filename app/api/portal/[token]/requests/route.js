// app/api/portal/[token]/requests/route.js
//
//   GET /api/portal/:token/requests
//
// For the CLIENT. There is no login: the magic-link token in the URL is the
// only credential, exactly like the existing approve route next to this one.
// lib/client-requests.js turns the token into the client and their project,
// and returns ONLY what the portal may show (no internal flags, no reminder
// counters, no cancelled requests).
//
// An invalid, unknown or malformed token always gives the same 404, so
// nobody can probe for valid tokens by looking at different error messages.
//
// Responses are marked no-store: this is private data and must never be
// kept by a browser or proxy cache.

import { NextResponse } from 'next/server'
import { handleApiError } from '@/lib/http-errors'
import { portalRateLimit } from '@/lib/portal-rate-limit'
import { listPortalRequests } from '@/lib/client-requests'

export async function GET(request, { params }) {
  try {
    const { token } = await params

    // Brake on hammering and token guessing (best effort, see lib/portal-rate-limit.js).
    const limited = portalRateLimit(request, token, { scope: 'list', perIp: 60, perLink: 60 })
    if (limited) return limited

    const data = await listPortalRequests(token)
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return handleApiError(error)
  }
}