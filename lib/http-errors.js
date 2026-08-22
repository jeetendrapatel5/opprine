// lib/http-errors.js
//
// The Next.js-specific half of error handling — turns our plain error
// classes (lib/errors.js) into actual HTTP responses. This file is only
// ever imported from API routes (which run inside Next.js), never from
// standalone scripts — that's the whole reason it's split out from
// lib/errors.js, which any plain `node script.mjs` needs to be able to
// import safely.
//
// Usage in a route:
//   } catch (error) {
//     return handleApiError(error)
//   }

import { NextResponse } from 'next/server'

export function handleApiError(error) {
  if (error.name === 'NotFoundError') {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }
  if (error.name === 'ForbiddenError') {
    return NextResponse.json({ error: error.message }, { status: 403 })
  }
  if (error.name === 'LimitExceededError') {
    return NextResponse.json({ error: error.message }, { status: 403 })
  }
  // Anything else is a real bug — log the full error for you, but never
  // leak internals (stack traces, SQL, etc.) to the client.
  console.error('Unexpected API error:', error)
  return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
}