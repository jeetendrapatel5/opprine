// lib/billing/plan-verification.test.js
//
// Run with:  node --test lib/billing/plan-verification.test.js

import test from 'node:test'
import assert from 'node:assert/strict'
import { assertRazorpayPlanMatches } from './plan-verification.js'

const pricing = { amount: 99900, razorpayPlanId: 'plan_pro_m' }
const plan = (overrides = {}) => ({
  id: 'plan_pro_m',
  period: 'monthly',
  interval: 1,
  item: { amount: 99900, currency: 'INR' },
  ...overrides,
})
const client = (remote) => ({ plans: { fetch: async () => remote } })

test('a matching plan passes', async () => {
  await assertRazorpayPlanMatches(client(plan()), pricing, 'MONTHLY')
  await assertRazorpayPlanMatches(client(plan({ period: 'yearly' })), pricing, 'YEARLY')
})

test('a different amount, currency or interval is rejected', async () => {
  await assert.rejects(assertRazorpayPlanMatches(client(plan({ item: { amount: 49900, currency: 'INR' } })), pricing, 'MONTHLY'), /amount/)
  await assert.rejects(assertRazorpayPlanMatches(client(plan({ item: { amount: 99900, currency: 'USD' } })), pricing, 'MONTHLY'), /currency/)
  await assert.rejects(assertRazorpayPlanMatches(client(plan({ period: 'yearly' })), pricing, 'MONTHLY'), /interval/)
  await assert.rejects(assertRazorpayPlanMatches(client(plan({ interval: 3 })), pricing, 'MONTHLY'), /interval/)
})

test('a Razorpay failure propagates', async () => {
  const failing = { plans: { fetch: async () => Promise.reject(new Error('down')) } }
  await assert.rejects(assertRazorpayPlanMatches(failing, pricing, 'MONTHLY'), /down/)
})
