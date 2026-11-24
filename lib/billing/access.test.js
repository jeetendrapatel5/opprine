// lib/billing/access.test.js
//
// Run with:  node --test lib/billing/access.test.js

import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveAccess, PAST_DUE_GRACE_MS } from './access.js'

const NOW = new Date('2026-12-01T00:00:00Z')
const DAY = 24 * 60 * 60 * 1000
const row = (status, offsetMs, plan = 'PRO') => ({
  plan,
  status,
  currentPeriodEnd: offsetMs === null ? null : new Date(NOW.getTime() + offsetMs),
})

test('no subscription grants FREE', () => {
  assert.equal(resolveAccess(null, NOW), 'FREE')
})

test('ACTIVE grants its plan', () => {
  assert.equal(resolveAccess(row('ACTIVE', DAY, 'TEAM'), NOW), 'TEAM')
})

test('PENDING and EXPIRED never grant paid access', () => {
  assert.equal(resolveAccess(row('PENDING', DAY), NOW), 'FREE')
  assert.equal(resolveAccess(row('EXPIRED', DAY), NOW), 'FREE')
})

test('PAST_DUE keeps access inside the grace window and loses it after', () => {
  assert.equal(resolveAccess(row('PAST_DUE', -DAY), NOW), 'PRO')
  assert.equal(resolveAccess(row('PAST_DUE', -(PAST_DUE_GRACE_MS - 1)), NOW), 'PRO')
  assert.equal(resolveAccess(row('PAST_DUE', -PAST_DUE_GRACE_MS), NOW), 'FREE')
})

test('PAST_DUE without a period end grants nothing', () => {
  assert.equal(resolveAccess(row('PAST_DUE', null), NOW), 'FREE')
})

test('CANCELLED keeps access only until the paid period ends', () => {
  assert.equal(resolveAccess(row('CANCELLED', DAY), NOW), 'PRO')
  assert.equal(resolveAccess(row('CANCELLED', 0), NOW), 'FREE')
  assert.equal(resolveAccess(row('CANCELLED', -DAY), NOW), 'FREE')
  assert.equal(resolveAccess(row('CANCELLED', null), NOW), 'FREE')
})
