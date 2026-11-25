// lib/billing/webhook-signature.js

import crypto from 'node:crypto'

const SIGNATURE_PATTERN = /^[0-9a-f]{64}$/i

// Throws when the secret is unset or empty: an empty HMAC key is valid,
// so it would let anyone compute a matching signature.
export function verifyWebhookSignature(rawBody, signature, secret) {
  if (!secret) throw new Error('Webhook secret is not configured')
  if (typeof signature !== 'string' || !SIGNATURE_PATTERN.test(signature)) return false

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest()
  return crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex'))
}

// The event-id header is not covered by the signature; the body is.
export function hashWebhookBody(rawBody) {
  return crypto.createHash('sha256').update(rawBody).digest('hex')
}