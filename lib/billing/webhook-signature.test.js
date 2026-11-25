// lib/billing/webhook-signature.test.js
//
// Run with:  node --test lib/billing/webhook-signature.test.js

import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { verifyWebhookSignature, hashWebhookBody } from './webhook-signature.js'

const SECRET = 'whsec_test_secret'
const BODY = JSON.stringify({ event: 'subscription.charged', payload: {} })

function sign(body, secret) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

test('accepts a signature computed over the exact body with the secret', () => {
  assert.equal(verifyWebhookSignature(BODY, sign(BODY, SECRET), SECRET), true)
})

test('accepts an uppercase hex signature', () => {
  assert.equal(verifyWebhookSignature(BODY, sign(BODY, SECRET).toUpperCase(), SECRET), true)
})

test('rejects a tampered body, a wrong secret and a re-serialised body', () => {
  const signature = sign(BODY, SECRET)
  assert.equal(verifyWebhookSignature(BODY + ' ', signature, SECRET), false)
  assert.equal(verifyWebhookSignature(BODY, signature, 'another_secret'), false)
  assert.equal(verifyWebhookSignature(JSON.stringify(JSON.parse(BODY), null, 2), signature, SECRET), false)
})

test('malformed signatures are rejected without throwing', () => {
  const valid = sign(BODY, SECRET)
  const malformed = [
    '',
    null,
    undefined,
    42,
    valid.slice(0, 62),
    valid + '00',
    'g'.repeat(64),
    'é'.repeat(64),
    ` ${valid}`,
  ]
  for (const signature of malformed) {
    assert.equal(verifyWebhookSignature(BODY, signature, SECRET), false, String(signature))
  }
})

test('an unset or empty secret throws instead of verifying', () => {
  const forged = sign(BODY, '')
  for (const secret of [undefined, null, '']) {
    assert.throws(() => verifyWebhookSignature(BODY, forged, secret), /not configured/)
  }
})

test('hashWebhookBody is deterministic and body-sensitive', () => {
  assert.match(hashWebhookBody(BODY), /^[0-9a-f]{64}$/)
  assert.equal(hashWebhookBody(BODY), hashWebhookBody(BODY))
  assert.notEqual(hashWebhookBody(BODY), hashWebhookBody(BODY + ' '))
})