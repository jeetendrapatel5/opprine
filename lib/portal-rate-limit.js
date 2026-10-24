// lib/portal-rate-limit.js
//
// One shared rate-limit check for the client-portal API routes, so every route
// asks the same question the same way (and says "too many requests" the same
// way). Built on lib/rate-limit.js.
//
// Read the warning at the top of lib/rate-limit.js: the counters live in ONE
// server instance's memory, so this is a best-effort brake against abuse and
// guessing, not a hard guarantee. The real protection for a magic link is that
// the token is long and random (lib/magic-token.js); this only slows down
// someone hammering the endpoints.
//
// Usage in a route (token comes from the URL):
//   const limited = portalRateLimit(request, token, { scope: 'answer', perIp: 30, perLink: 20 })
//   if (limited) return limited      // a ready-made 429 response

import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from './rate-limit.js'

const TEN_MINUTES = 10 * 60 * 1000

// Returns a 429 NextResponse when this caller (by IP, or by link) is over the
// limit for `scope` in the last `windowMs`; otherwise null. Every call counts
// as one hit, including calls with a wrong token, so guessing is slowed too.
export function portalRateLimit(request, token, { scope, perIp, perLink, windowMs = TEN_MINUTES }) {
  const ip = checkRateLimit(`portal:${scope}:ip:${getClientIp(request)}`, { limit: perIp, windowMs })
  const link = checkRateLimit(`portal:${scope}:link:${String(token).slice(0, 200)}`, { limit: perLink, windowMs })
  if (ip.allowed && link.allowed) return null

  return NextResponse.json(
    { error: 'Too many requests. Please wait a few minutes and try again.' },
    { status: 429, headers: { 'Retry-After': String(Math.ceil(windowMs / 1000)) } }
  )
}