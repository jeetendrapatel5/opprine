// lib/billing/cron-auth.js
//
// Bearer-token check for scheduler-invoked routes. Fails closed when the
// secret is not configured.

import crypto from 'node:crypto'

export function isCronAuthorized(authorizationHeader, secret) {
  if (!secret) return false
  const [scheme, token] = (authorizationHeader ?? '').split(' ')
  if (scheme !== 'Bearer' || !token) return false
  const a = Buffer.from(token)
  const b = Buffer.from(secret)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
