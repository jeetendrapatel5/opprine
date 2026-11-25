// lib/billing/reconcile.integration.test.js
//
// Runs against a real Postgres. Skipped unless BILLING_TEST_DATABASE_URL
// is set. Wipes Payment, WebhookEvent, CheckoutAttempt, Subscription and
// Workspace rows, so run the integration files with --test-concurrency=1.

import test, { before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { handleRazorpayWebhook } from './webhook-handler.js'
import { runBillingReconcile, reconcileSubscriptions } from './reconcile.js'

const url = process.env.BILLING_TEST_DATABASE_URL
const opts = { skip: url ? false : 'BILLING_TEST_DATABASE_URL is not set' }
const SECRET = 'whsec_reconcile'
const SUB = 'sub_rc_1'
const NOW = new Date('2026-12-01T00:00:00Z')
const NOW_S = Math.floor(NOW.getTime() / 1000)

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
  await prisma.payment.deleteMany()
  await prisma.webhookEvent.deleteMany()
  await prisma.checkoutAttempt.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.workspace.deleteMany()
  workspaceId = (await prisma.workspace.create({ data: { name: 'Reconcile workspace' } })).id
  await prisma.subscription.create({
    data: { workspaceId, plan: 'PRO', billingCycle: 'MONTHLY', status: 'PENDING', razorpaySubscriptionId: SUB },
  })
})

const PAID_SUB = { id: SUB, status: 'active', paid_count: 1, current_start: NOW_S - 86400, current_end: NOW_S + 29 * 86400 }
const payment = (overrides = {}) => ({
  id: 'pay_1',
  amount: 99900,
  currency: 'INR',
  status: 'captured',
  amount_refunded: 0,
  method: 'card',
  invoice_id: 'inv_1',
  created_at: NOW_S - 3600,
  ...overrides,
})

function fakeRazorpay({ subscription = PAID_SUB, payments = {}, listed = [], invoiceSubscription = SUB } = {}) {
  const state = { subscription, payments: { ...payments }, listed, fetches: { payments: 0, invoices: 0 } }
  return {
    state,
    subscriptions: { fetch: async () => state.subscription },
    payments: {
      fetch: async (id) => {
        state.fetches.payments += 1
        return state.payments[id]
      },
      all: async ({ skip }) => ({ items: skip === 0 ? state.listed : [] }),
    },
    invoices: {
      fetch: async () => {
        state.fetches.invoices += 1
        return { subscription_id: invoiceSubscription }
      },
    },
  }
}

let counter = 0
function deliver(razorpay, event, notify) {
  counter += 1
  const body = { created_at: NOW_S + counter, ...event }
  const rawBody = JSON.stringify(body)
  const signature = crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex')
  return handleRazorpayWebhook({ rawBody, signature, eventId: `evt_${counter}`, secret: SECRET, prisma, razorpay, notify })
}

const chargedEvent = {
  event: 'subscription.charged',
  payload: { payment: { entity: { id: 'pay_1' } }, subscription: { entity: { id: SUB } } },
}

test('a charge records the payment against the workspace and activates it', opts, async () => {
  const razorpay = fakeRazorpay({ payments: { pay_1: payment() } })
  await deliver(razorpay, chargedEvent)

  const row = await prisma.payment.findUnique({ where: { razorpayPaymentId: 'pay_1' } })
  assert.equal(row.workspaceId, workspaceId)
  assert.equal(row.razorpaySubscriptionId, SUB)
  assert.equal(row.amount, 99900)
  assert.equal(row.currency, 'INR')
  assert.equal(row.status, 'CAPTURED')
  assert.equal((await prisma.subscription.findUnique({ where: { workspaceId } })).status, 'ACTIVE')
})

test('a standalone payment event resolves its workspace through the invoice', opts, async () => {
  const razorpay = fakeRazorpay({ payments: { pay_1: payment({ status: 'failed', error_code: 'BAD_REQUEST_ERROR', error_description: 'declined' }) } })
  const result = await deliver(razorpay, { event: 'payment.failed', payload: { payment: { entity: { id: 'pay_1' } } } })

  assert.deepEqual(result.body, { status: 'processed' })
  const row = await prisma.payment.findUnique({ where: { razorpayPaymentId: 'pay_1' } })
  assert.equal(row.status, 'FAILED')
  assert.equal(row.workspaceId, workspaceId)
  assert.equal(row.failureReason, 'declined')
  assert.equal((await prisma.subscription.findUnique({ where: { workspaceId } })).status, 'PENDING')
})

test('a refund updates the ledger from Razorpay state and raises one alert', opts, async () => {
  const razorpay = fakeRazorpay({ payments: { pay_1: payment() } })
  await deliver(razorpay, chargedEvent)

  razorpay.state.payments.pay_1 = payment({ amount_refunded: 99900, status: 'refunded' })
  const alerts = []
  await deliver(razorpay, { event: 'refund.processed', payload: { refund: { entity: { id: 'rfnd_1', payment_id: 'pay_1' } } } }, async (a) => alerts.push(...a))

  const row = await prisma.payment.findUnique({ where: { razorpayPaymentId: 'pay_1' } })
  assert.equal(row.status, 'REFUNDED')
  assert.equal(row.amountRefunded, 99900)
  assert.deepEqual(alerts.map((a) => a.kind), ['REFUND'])
})

test('dispute events are ordered by event time, not arrival', opts, async () => {
  const razorpay = fakeRazorpay({ payments: { pay_1: payment() } })
  const dispute = (status, createdAt) => ({
    event: `payment.dispute.${status}`,
    created_at: createdAt,
    payload: { dispute: { entity: { id: 'disp_1', payment_id: 'pay_1', status } } },
  })
  await deliver(razorpay, dispute('won', NOW_S + 200))
  await deliver(razorpay, dispute('open', NOW_S + 100))

  const row = await prisma.payment.findUnique({ where: { razorpayPaymentId: 'pay_1' } })
  assert.equal(row.disputeStatus, 'won')
  assert.equal(row.disputeId, 'disp_1')
})

test('a captured payment that belongs to no workspace raises an alert', opts, async () => {
  const razorpay = fakeRazorpay({ payments: { pay_9: payment({ id: 'pay_9', invoice_id: 'inv_x' }) }, invoiceSubscription: 'sub_nobody' })
  const alerts = []
  await deliver(razorpay, { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_9' } } } }, async (a) => alerts.push(...a))

  const row = await prisma.payment.findUnique({ where: { razorpayPaymentId: 'pay_9' } })
  assert.equal(row.workspaceId, null)
  assert.deepEqual(alerts.map((a) => a.kind), ['UNATTRIBUTED_PAYMENT'])
})

test('reconciliation heals a subscription whose webhooks were never delivered', opts, async () => {
  const razorpay = fakeRazorpay({ listed: [payment()] })
  await prisma.subscription.update({ where: { workspaceId }, data: { status: 'ACTIVE', currentPeriodEnd: new Date(NOW.getTime() - 10 * 86400_000) } })

  const { summary } = await runBillingReconcile({ prisma, razorpay, now: NOW })

  const sub = await prisma.subscription.findUnique({ where: { workspaceId } })
  assert.equal(sub.currentPeriodEnd.getTime(), (NOW_S + 29 * 86400) * 1000)
  assert.equal(summary.failures, 0)
  assert.equal(await prisma.payment.count(), 1)
  assert.equal((await prisma.payment.findFirst()).workspaceId, workspaceId)
})

test('reconciliation expires an ACTIVE row that Razorpay reports as halted', opts, async () => {
  await prisma.subscription.update({ where: { workspaceId }, data: { status: 'ACTIVE' } })
  const razorpay = fakeRazorpay({ subscription: { ...PAID_SUB, status: 'halted' } })
  await reconcileSubscriptions({ prisma, razorpay, now: NOW })
  assert.equal((await prisma.subscription.findUnique({ where: { workspaceId } })).status, 'EXPIRED')
})

test('a Razorpay failure for one subscription does not stop the rest', opts, async () => {
  const other = await prisma.workspace.create({ data: { name: 'Second' } })
  await prisma.subscription.update({ where: { workspaceId }, data: { status: 'ACTIVE' } })
  await prisma.subscription.create({
    data: { workspaceId: other.id, plan: 'TEAM', billingCycle: 'MONTHLY', status: 'ACTIVE', razorpaySubscriptionId: 'sub_rc_2' },
  })
  const razorpay = fakeRazorpay()
  razorpay.subscriptions.fetch = async (id) => {
    if (id === SUB) throw new Error('boom')
    return { ...PAID_SUB, id }
  }
  const result = await reconcileSubscriptions({ prisma, razorpay, now: NOW })

  assert.equal(result.checked, 2)
  assert.deepEqual(result.failures.map((f) => f.subscriptionId), [SUB])
  assert.equal((await prisma.subscription.findUnique({ where: { workspaceId: other.id } })).currentPeriodEnd.getTime(), (NOW_S + 29 * 86400) * 1000)
})

test('an unmatched event is retried once its subscription exists, then stops being unmatched', opts, async (t) => {
  t.mock.method(console, 'error', () => {})
  const razorpay = fakeRazorpay({ payments: { pay_1: payment() } })
  const event = {
    event: 'subscription.charged',
    payload: { payment: { entity: { id: 'pay_1' } }, subscription: { entity: { id: 'sub_late' } } },
  }
  const first = await deliver(razorpay, event)
  assert.deepEqual(first.body, { status: 'unmatched' })

  await prisma.subscription.update({ where: { workspaceId }, data: { razorpaySubscriptionId: 'sub_late' } })
  razorpay.state.subscription = { ...PAID_SUB, id: 'sub_late' }
  await prisma.webhookEvent.updateMany({ data: { processedAt: new Date(NOW.getTime() - 3600_000) } })

  const { summary } = await runBillingReconcile({ prisma, razorpay, now: NOW })
  assert.equal(summary.eventsResolved, 1)
  assert.equal((await prisma.webhookEvent.findFirst()).status, 'PROCESSED')
  assert.equal((await prisma.subscription.findUnique({ where: { workspaceId } })).status, 'ACTIVE')
})

test('old webhook payloads are purged and the row is kept', opts, async () => {
  const razorpay = fakeRazorpay()
  await deliver(razorpay, { event: 'order.paid', payload: {} })
  await prisma.webhookEvent.updateMany({ data: { processedAt: new Date(NOW.getTime() - 120 * 86400_000) } })

  const { summary } = await runBillingReconcile({ prisma, razorpay, now: NOW })
  assert.equal(summary.payloadsPurged, 1)
  const row = await prisma.webhookEvent.findFirst()
  assert.equal(row.payload, null)
  assert.equal(await prisma.webhookEvent.count(), 1)
})

test('a refund already recorded does not alert again on a later sync', opts, async () => {
  const razorpay = fakeRazorpay({ payments: { pay_1: payment({ amount_refunded: 99900, status: 'refunded' }) } })
  const refundEvent = { event: 'refund.processed', payload: { refund: { entity: { id: 'rfnd_1', payment_id: 'pay_1' } } } }
  const alerts = []
  await deliver(razorpay, refundEvent, async (a) => alerts.push(...a))
  await deliver(razorpay, refundEvent, async (a) => alerts.push(...a))
  assert.deepEqual(alerts.map((a) => a.kind), ['REFUND'])
})

test('recent webhook payloads are not purged', opts, async () => {
  const razorpay = fakeRazorpay()
  await deliver(razorpay, { event: 'order.paid', payload: { order: { entity: { id: 'order_1' } } } })
  await prisma.webhookEvent.updateMany({ data: { processedAt: new Date(NOW.getTime() - 30 * 86400_000) } })

  const { summary } = await runBillingReconcile({ prisma, razorpay, now: NOW })
  assert.equal(summary.payloadsPurged, 0)
  assert.notEqual((await prisma.webhookEvent.findFirst()).payload, null)
})
