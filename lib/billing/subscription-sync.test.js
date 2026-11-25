// lib/billing/subscription-sync.test.js
//
// Run with:  node --test lib/billing/subscription-sync.test.js

import test from 'node:test'
import assert from 'node:assert/strict'
import { mapRazorpayStatus, buildSubscriptionUpdate, syncSubscriptionState } from './subscription-sync.js'

const SUB = 'sub_test_1'

function remote(overrides = {}) {
  return {
    id: SUB,
    status: 'active',
    paid_count: 1,
    current_start: 1_700_000_000,
    current_end: 1_702_592_000,
    has_scheduled_changes: false,
    ...overrides,
  }
}

test('every documented Razorpay status maps to a local status', () => {
  const expected = {
    created: 'PENDING',
    authenticated: 'PENDING',
    active: 'ACTIVE',
    pending: 'PAST_DUE',
    halted: 'EXPIRED',
    paused: 'EXPIRED',
    cancelled: 'CANCELLED',
    completed: 'CANCELLED',
    expired: 'EXPIRED',
  }
  for (const [status, local] of Object.entries(expected)) {
    assert.equal(mapRazorpayStatus(remote({ status })), local, status)
  }
})

test('an unknown status throws so the event is retried and surfaced', () => {
  assert.throws(() => mapRazorpayStatus(remote({ status: 'archived' })), /Unknown Razorpay subscription status/)
})

test('active without a successful charge stays PENDING', () => {
  assert.equal(mapRazorpayStatus(remote({ paid_count: 0 })), 'PENDING')
  assert.equal(mapRazorpayStatus(remote({ paid_count: 1 })), 'ACTIVE')
  assert.equal(mapRazorpayStatus(remote({ paid_count: 12 })), 'ACTIVE')
})

test('a missing paid_count falls back to the Razorpay status', () => {
  const { paid_count, ...withoutCount } = remote()
  assert.equal(paid_count, 1)
  assert.equal(mapRazorpayStatus(withoutCount), 'ACTIVE')
})

test('period dates are converted from unix seconds and never overwritten with null', () => {
  const full = buildSubscriptionUpdate(remote())
  assert.equal(full.currentPeriodStart.toISOString(), new Date(1_700_000_000 * 1000).toISOString())
  assert.equal(full.currentPeriodEnd.toISOString(), new Date(1_702_592_000 * 1000).toISOString())

  const halted = buildSubscriptionUpdate(remote({ status: 'halted', current_start: null, current_end: null }))
  assert.equal('currentPeriodStart' in halted, false)
  assert.equal('currentPeriodEnd' in halted, false)
})

test('a cancelled subscription keeps access only until it ended or its period end, whichever is earlier', () => {
  const now = new Date(1_701_000_000 * 1000)
  const immediate = buildSubscriptionUpdate(remote({ status: 'cancelled', ended_at: 1_700_500_000 }), now)
  assert.equal(immediate.currentPeriodEnd.getTime(), 1_700_500_000 * 1000)

  const atCycleEnd = buildSubscriptionUpdate(remote({ status: 'cancelled', ended_at: 1_702_592_000 }), now)
  assert.equal(atCycleEnd.currentPeriodEnd.getTime(), 1_702_592_000 * 1000)

  const noEndedAt = buildSubscriptionUpdate(remote({ status: 'cancelled', current_end: null }), now)
  assert.equal(noEndedAt.currentPeriodEnd.getTime(), now.getTime())
})

test('the Razorpay customer id is stored when present', () => {
  assert.equal(buildSubscriptionUpdate(remote({ customer_id: 'cust_1' })).razorpayCustomerId, 'cust_1')
  assert.equal('razorpayCustomerId' in buildSubscriptionUpdate(remote({ customer_id: null })), false)
})

test('cancelAtPeriodEnd is set for scheduled changes on active and cleared once ended', () => {
  assert.equal(buildSubscriptionUpdate(remote({ has_scheduled_changes: true })).cancelAtPeriodEnd, true)
  assert.equal('cancelAtPeriodEnd' in buildSubscriptionUpdate(remote()), false)
  assert.equal(buildSubscriptionUpdate(remote({ status: 'cancelled' })).cancelAtPeriodEnd, false)
  assert.equal(buildSubscriptionUpdate(remote({ status: 'halted' })).cancelAtPeriodEnd, false)
  assert.equal('cancelAtPeriodEnd' in buildSubscriptionUpdate(remote({ status: 'pending' })), false)
})

function fakeTx({ local = { id: 'local_1' }, attempt = null, replaced = null } = {}) {
  const calls = []
  return {
    calls,
    $executeRaw: async () => calls.push('lock'),
    checkoutAttempt: {
      findUnique: async () => attempt,
      findFirst: async () => replaced,
    },
    subscription: {
      findUnique: async () => {
        calls.push('find')
        return local
      },
      update: async (args) => {
        calls.push('update')
        return args
      },
    },
  }
}

test('takes the lock before reading, then fetches and updates', async () => {
  const tx = fakeTx()
  const razorpay = { subscriptions: { fetch: async () => (tx.calls.push('fetch'), remote()) } }

  assert.equal(await syncSubscriptionState(tx, razorpay, SUB), 'PROCESSED')
  assert.deepEqual(tx.calls, ['lock', 'find', 'fetch', 'update'])
})

test('an unknown subscription returns UNMATCHED without calling Razorpay', async () => {
  const tx = fakeTx({ local: null })
  const razorpay = { subscriptions: { fetch: async () => assert.fail('must not fetch') } }

  assert.equal(await syncSubscriptionState(tx, razorpay, SUB), 'UNMATCHED')
  assert.deepEqual(tx.calls, ['lock', 'find'])
})

test('an event for a subscription that a later checkout replaced is ignored', async () => {
  const tx = fakeTx({ local: null, replaced: { id: 'attempt_1' } })
  const razorpay = { subscriptions: { fetch: async () => assert.fail('must not fetch') } }
  assert.equal(await syncSubscriptionState(tx, razorpay, SUB), 'IGNORED')
})

test('a fetched subscription with a different id is rejected before any write', async () => {
  const tx = fakeTx()
  const razorpay = { subscriptions: { fetch: async () => remote({ id: 'sub_other' }) } }

  await assert.rejects(syncSubscriptionState(tx, razorpay, SUB), /sub_other/)
  assert.equal(tx.calls.includes('update'), false)
})

test('a failing or slow Razorpay call propagates and never writes', async () => {
  const failing = { subscriptions: { fetch: async () => Promise.reject({ statusCode: 500, error: { description: 'down' } }) } }
  const txFail = fakeTx()
  await assert.rejects(syncSubscriptionState(txFail, failing, SUB))
  assert.equal(txFail.calls.includes('update'), false)

  const slow = { subscriptions: { fetch: () => new Promise(() => {}) } }
  const txSlow = fakeTx()
  await assert.rejects(syncSubscriptionState(txSlow, slow, SUB, { timeoutMs: 20 }), /timed out/)
  assert.equal(txSlow.calls.includes('update'), false)
})