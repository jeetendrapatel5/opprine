// lib/billing/cron-auth.test.js
//
// Run with:  node --test lib/billing/cron-auth.test.js

import test from 'node:test'
import assert from 'node:assert/strict'
import { isCronAuthorized } from './cron-auth.js'

test('accepts only the exact bearer secret', () => {
  assert.equal(isCronAuthorized('Bearer s3cret', 's3cret'), true)
  assert.equal(isCronAuthorized('Bearer s3cre', 's3cret'), false)
  assert.equal(isCronAuthorized('Bearer s3cret2', 's3cret'), false)
  assert.equal(isCronAuthorized('Basic s3cret', 's3cret'), false)
  assert.equal(isCronAuthorized('s3cret', 's3cret'), false)
})

test('fails closed when the secret or header is missing', () => {
  assert.equal(isCronAuthorized('Bearer undefined', undefined), false)
  assert.equal(isCronAuthorized('Bearer ', ''), false)
  assert.equal(isCronAuthorized(null, 's3cret'), false)
  assert.equal(isCronAuthorized('', 's3cret'), false)
})
