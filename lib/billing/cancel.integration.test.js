// lib/billing/cancel.integration.test.js
//
// Runs against a real Postgres. Skipped unless BILLING_TEST_DATABASE_URL
// is set. The database is wiped of Subscription and Workspace rows.
// These files share one database and wipe each other's rows, so run them
// with --test-concurrency=1 when BILLING_TEST_DATABASE_URL is set.

import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { cancelSubscription } from './cancel.js'

const url = process.env.BILLING_TEST_DATABASE_URL
const opts = { skip: url ? false : 'BILLING_TEST_DATABASE_URL is not set' }
const SUB = 'sub_cancel_1'
const PERIOD_END = 4_102_444_800

let pool
let prisma
let subscription

before(() => {
  if (!url) return
  pool = new Pool({ connectionString: url, max: 5 })
  prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
})

after(async () => {
  if (!url) return
  await prisma.$disconnect()
  await pool.end()
})

async function seed(status = 'ACTIVE') {
  await prisma.subscription.deleteMany()
  await prisma.workspace.deleteMany()
  const workspace = await prisma.workspace.create({ data: { name: 'Cancel workspace' } })
  subscription = await prisma.subscription.create({
    data: { workspaceId: workspace.id, plan: 'PRO', billingCycle: 'MONTHLY', status, razorpaySubscriptionId: SUB },
  })
}

function razorpayWith({ cancel, remote }) {
  const calls = []
  return {
    calls,
    subscriptions: {
      cancel: async (id, flag) => {
        calls.push([id, flag])
        if (cancel) throw cancel
      },
      fetch: async () => remote(),
    },
  }
}

const ACTIVE = { id: SUB, status: 'active', paid_count: 1, current_start: 1_700_000_000, current_end: PERIOD_END }
const rowNow = () => prisma.subscription.findUnique({ where: { id: subscription.id } })

test('cancel at cycle end passes true and keeps access until the period end', opts, async () => {
  await seed()
  const razorpay = razorpayWith({ remote: () => ({ ...ACTIVE, has_scheduled_changes: true }) })
  const result = await cancelSubscription({ prisma, razorpay, subscription, immediately: false })

  assert.deepEqual(razorpay.calls, [[SUB, true]])
  assert.equal(result.status, 200)
  const row = await rowNow()
  assert.equal(row.status, 'ACTIVE')
  assert.equal(row.cancelAtPeriodEnd, true)
})

test('immediate cancel passes false and ends access now', opts, async () => {
  await seed()
  const endedAt = Math.floor(Date.now() / 1000)
  const razorpay = razorpayWith({ remote: () => ({ ...ACTIVE, status: 'cancelled', ended_at: endedAt }) })
  const result = await cancelSubscription({ prisma, razorpay, subscription, immediately: true })

  assert.deepEqual(razorpay.calls, [[SUB, false]])
  assert.equal(result.body.cancelledImmediately, true)
  const row = await rowNow()
  assert.equal(row.status, 'CANCELLED')
  assert.equal(row.currentPeriodEnd.getTime(), endedAt * 1000)
})

test('a pending subscription is always cancelled immediately', opts, async () => {
  await seed('PENDING')
  const razorpay = razorpayWith({ remote: () => ({ id: SUB, status: 'cancelled', paid_count: 0, ended_at: 1_700_000_000 }) })
  await cancelSubscription({ prisma, razorpay, subscription, immediately: false })
  assert.deepEqual(razorpay.calls, [[SUB, false]])
})

test('a Razorpay rejection for an already ended subscription is reported and reconciled', opts, async () => {
  await seed()
  const rejection = { statusCode: 400, error: { description: 'Subscription is not cancellable in cancelled status.' } }
  const razorpay = razorpayWith({ cancel: rejection, remote: () => ({ ...ACTIVE, status: 'cancelled', ended_at: 1_700_000_000 }) })
  const result = await cancelSubscription({ prisma, razorpay, subscription, immediately: true })

  assert.equal(result.status, 400)
  assert.equal((await rowNow()).status, 'CANCELLED')
})

test('a rejection while the subscription is still live is rethrown unchanged', opts, async () => {
  await seed()
  const rejection = { statusCode: 400, error: { description: 'Not allowed' } }
  const razorpay = razorpayWith({ cancel: rejection, remote: () => ACTIVE })
  await assert.rejects(cancelSubscription({ prisma, razorpay, subscription, immediately: true }), (err) => err === rejection)
  assert.equal((await rowNow()).status, 'ACTIVE')
})

test('a server error from Razorpay is rethrown and changes nothing', opts, async () => {
  await seed()
  const razorpay = razorpayWith({ cancel: { statusCode: 502 }, remote: () => ACTIVE })
  await assert.rejects(cancelSubscription({ prisma, razorpay, subscription, immediately: true }))
  assert.equal((await rowNow()).status, 'ACTIVE')
})

test('if the refresh after a successful cancel fails, the requested intent is recorded', opts, async (t) => {
  t.mock.method(console, 'error', () => {})
  await seed()
  const razorpay = razorpayWith({ remote: () => Promise.reject(new Error('Razorpay unavailable')) })
  await cancelSubscription({ prisma, razorpay, subscription, immediately: true })

  const row = await rowNow()
  assert.equal(row.status, 'CANCELLED')
  assert.ok(row.currentPeriodEnd.getTime() <= Date.now())
})
