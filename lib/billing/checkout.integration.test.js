// lib/billing/checkout.integration.test.js
//
// Runs against a real Postgres with all migrations applied. Skipped
// unless BILLING_TEST_DATABASE_URL is set. The database is wiped of
// Subscription, CheckoutAttempt, Workspace and WebhookEvent rows.
// These files share one database and wipe each other's rows, so run them
// with --test-concurrency=1 when BILLING_TEST_DATABASE_URL is set.

import test, { before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { createCheckout } from './checkout.js'
import { handleRazorpayWebhook } from './webhook-handler.js'

const url = process.env.BILLING_TEST_DATABASE_URL
const opts = { skip: url ? false : 'BILLING_TEST_DATABASE_URL is not set' }
const SECRET = 'whsec_checkout'
const PRO_M = { currency: 'USD', amount: 2900, razorpayPlanId: 'plan_pro_m' }
const TEAM_M = { currency: 'USD', amount: 7900, razorpayPlanId: 'plan_team_m' }
const PRO_M_USD = { currency: 'USD', amount: null, razorpayPlanId: 'plan_pro_m_usd' }

let pool
let prisma
let workspaceId

before(() => {
  if (!url) return
  pool = new Pool({ connectionString: url, max: 10 })
  prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
})

after(async () => {
  if (!url) return
  await prisma.$disconnect()
  await pool.end()
})

beforeEach(async () => {
  if (!url) return
  await prisma.webhookEvent.deleteMany()
  await prisma.checkoutAttempt.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.workspace.deleteMany()
  workspaceId = (await prisma.workspace.create({ data: { name: 'Checkout workspace' } })).id
})

// Fake Razorpay: creates sequential subscription ids and serves a
// mutable remote state per subscription.
function fakeRazorpay() {
  const remotes = new Map()
  const cancelled = []
  let counter = 0
  return {
    remotes,
    cancelled,
    subscriptions: {
      create: async () => {
        counter += 1
        const id = `sub_new_${counter}`
        remotes.set(id, { id, status: 'created', paid_count: 0, customer_id: null })
        return { id }
      },
      fetch: async (id) => remotes.get(id),
      cancel: async (id) => {
        cancelled.push(id)
      },
    },
  }
}

const PAID = { status: 'active', paid_count: 1, customer_id: 'cust_1', current_start: 1_700_000_000, current_end: 4_102_444_800 }

function checkout(razorpay, pricing = PRO_M, plan = 'PRO') {
  return createCheckout({ prisma, razorpay, workspaceId, plan, billingCycle: 'MONTHLY', pricing })
}

let eventCounter = 0
function webhook(razorpay, subscriptionId) {
  eventCounter += 1
  const event = { event: 'subscription.charged', created_at: eventCounter, payload: { subscription: { entity: { id: subscriptionId } } } }
  const rawBody = JSON.stringify(event)
  const signature = crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex')
  return handleRazorpayWebhook({ rawBody, signature, eventId: `evt_${eventCounter}`, secret: SECRET, prisma, razorpay })
}

async function row() {
  return prisma.subscription.findUnique({ where: { workspaceId } })
}

test('checkout records an attempt and never writes the Subscription row', opts, async () => {
  const razorpay = fakeRazorpay()
  const { subscriptionId } = await checkout(razorpay)

  assert.equal(subscriptionId, 'sub_new_1')
  assert.equal(await row(), null)
  const attempts = await prisma.checkoutAttempt.findMany()
  assert.equal(attempts.length, 1)
  assert.equal(attempts[0].status, 'CREATED')
})

test('a repeated checkout for the same plan reuses the open attempt', opts, async () => {
  const razorpay = fakeRazorpay()
  const first = await checkout(razorpay)
  const second = await checkout(razorpay)
  assert.equal(second.subscriptionId, first.subscriptionId)
  assert.equal(await prisma.checkoutAttempt.count(), 1)
})

test('concurrent checkouts create one Razorpay subscription', opts, async () => {
  const razorpay = fakeRazorpay()
  const results = await Promise.all([checkout(razorpay), checkout(razorpay), checkout(razorpay)])
  assert.equal(new Set(results.map((r) => r.subscriptionId)).size, 1)
  assert.equal(await prisma.checkoutAttempt.count(), 1)
})

test('an unpaid attempt grants nothing and leaves a paid row untouched', opts, async () => {
  await prisma.subscription.create({
    data: {
      workspaceId,
      plan: 'PRO',
      billingCycle: 'MONTHLY',
      status: 'CANCELLED',
      razorpaySubscriptionId: 'sub_old',
      currentPeriodEnd: new Date('2099-01-01'),
    },
  })
  const razorpay = fakeRazorpay()
  const { subscriptionId } = await checkout(razorpay, TEAM_M, 'TEAM')
  razorpay.remotes.set(subscriptionId, { id: subscriptionId, status: 'authenticated', paid_count: 0 })
  await webhook(razorpay, subscriptionId)

  const current = await row()
  assert.equal(current.razorpaySubscriptionId, 'sub_old')
  assert.equal(current.plan, 'PRO')
  assert.equal(current.status, 'CANCELLED')
})

test('a paid attempt is promoted and records the subscription it replaced', opts, async () => {
  await prisma.subscription.create({
    data: { workspaceId, plan: 'PRO', billingCycle: 'MONTHLY', status: 'CANCELLED', razorpaySubscriptionId: 'sub_old', currentPeriodEnd: new Date('2020-01-01') },
  })
  const razorpay = fakeRazorpay()
  const { subscriptionId } = await checkout(razorpay, TEAM_M, 'TEAM')
  razorpay.remotes.set(subscriptionId, { id: subscriptionId, ...PAID })

  const result = await webhook(razorpay, subscriptionId)
  assert.equal(result.status, 200)

  const current = await row()
  assert.equal(current.status, 'ACTIVE')
  assert.equal(current.plan, 'TEAM')
  assert.equal(current.razorpaySubscriptionId, subscriptionId)
  assert.equal(current.razorpayCustomerId, 'cust_1')
  const attempt = await prisma.checkoutAttempt.findUnique({ where: { razorpaySubscriptionId: subscriptionId } })
  assert.equal(attempt.status, 'COMPLETED')
  assert.equal(attempt.replacedSubscriptionId, 'sub_old')
})

test('a first-time payer gets a Subscription row created on confirmation', opts, async () => {
  const razorpay = fakeRazorpay()
  const { subscriptionId } = await checkout(razorpay)
  razorpay.remotes.set(subscriptionId, { id: subscriptionId, ...PAID })
  await webhook(razorpay, subscriptionId)

  const current = await row()
  assert.equal(current.status, 'ACTIVE')
  assert.equal(current.plan, 'PRO')
  assert.equal(current.billingCycle, 'MONTHLY')
})

test('checkout is rejected while a subscription is live', opts, async () => {
  for (const status of ['ACTIVE', 'PAST_DUE']) {
    await prisma.subscription.deleteMany()
    await prisma.subscription.create({
      data: { workspaceId, plan: 'PRO', billingCycle: 'MONTHLY', status, razorpaySubscriptionId: `sub_${status}` },
    })
    const razorpay = fakeRazorpay()
    await assert.rejects(checkout(razorpay, TEAM_M, 'TEAM'), (err) => err.name === 'ConflictError', status)
    assert.equal(await prisma.checkoutAttempt.count(), 0)
  }
})

test('a payment that lands on a workspace that became live is cancelled and flagged', opts, async (t) => {
  t.mock.method(console, 'error', () => {})
  const razorpay = fakeRazorpay()
  const { subscriptionId } = await checkout(razorpay)
  await prisma.subscription.create({
    data: { workspaceId, plan: 'TEAM', billingCycle: 'MONTHLY', status: 'ACTIVE', razorpaySubscriptionId: 'sub_other' },
  })
  razorpay.remotes.set(subscriptionId, { id: subscriptionId, ...PAID })

  await webhook(razorpay, subscriptionId)

  assert.deepEqual(razorpay.cancelled, [subscriptionId])
  assert.equal((await row()).razorpaySubscriptionId, 'sub_other')
  const attempt = await prisma.checkoutAttempt.findUnique({ where: { razorpaySubscriptionId: subscriptionId } })
  assert.equal(attempt.status, 'CONFLICT')
})

test('events for a replaced subscription are ignored, not reported as unmatched', opts, async () => {
  await prisma.subscription.create({
    data: { workspaceId, plan: 'PRO', billingCycle: 'MONTHLY', status: 'CANCELLED', razorpaySubscriptionId: 'sub_old', currentPeriodEnd: new Date('2020-01-01') },
  })
  const razorpay = fakeRazorpay()
  const { subscriptionId } = await checkout(razorpay, TEAM_M, 'TEAM')
  razorpay.remotes.set(subscriptionId, { id: subscriptionId, ...PAID })
  await webhook(razorpay, subscriptionId)

  const late = await webhook(razorpay, 'sub_old')
  assert.deepEqual(late.body, { status: 'ignored' })
})

test('a cancelled or expired attempt is marked abandoned and a paid attempt is idempotent', opts, async () => {
  const razorpay = fakeRazorpay()
  const first = await checkout(razorpay)
  razorpay.remotes.set(first.subscriptionId, { id: first.subscriptionId, status: 'cancelled', paid_count: 0 })
  await webhook(razorpay, first.subscriptionId)
  assert.equal((await prisma.checkoutAttempt.findUnique({ where: { razorpaySubscriptionId: first.subscriptionId } })).status, 'ABANDONED')
  assert.equal(await row(), null)

  const second = await checkout(razorpay)
  razorpay.remotes.set(second.subscriptionId, { id: second.subscriptionId, ...PAID })
  await Promise.all([webhook(razorpay, second.subscriptionId), webhook(razorpay, second.subscriptionId)])
  await webhook(razorpay, second.subscriptionId)
  assert.equal((await row()).razorpaySubscriptionId, second.subscriptionId)
  assert.equal(await prisma.subscription.count(), 1)
})

test('the billing currency is recorded on the attempt and carried to the Subscription', opts, async () => {
  const razorpay = fakeRazorpay()
  const { subscriptionId } = await checkout(razorpay, PRO_M_USD)
  assert.equal((await prisma.checkoutAttempt.findFirst()).currency, 'USD')

  razorpay.remotes.set(subscriptionId, { id: subscriptionId, ...PAID })
  await webhook(razorpay, subscriptionId)
  assert.equal((await row()).currency, 'USD')
})

test('open attempts in different currencies are not reused for each other', opts, async () => {
  const razorpay = fakeRazorpay()
  const inr = await checkout(razorpay, PRO_M)
  const usd = await checkout(razorpay, PRO_M_USD)
  assert.notEqual(usd.subscriptionId, inr.subscriptionId)
  assert.equal(await prisma.checkoutAttempt.count(), 2)
})
