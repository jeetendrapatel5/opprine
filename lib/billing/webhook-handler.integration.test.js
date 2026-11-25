// lib/billing/webhook-handler.integration.test.js
//
// Runs against a real Postgres with all migrations applied. Skipped
// unless BILLING_TEST_DATABASE_URL is set:
//
//   BILLING_TEST_DATABASE_URL=postgresql://... node --test lib/billing/webhook-handler.integration.test.js
//
// The database is wiped of Subscription, Workspace and WebhookEvent rows.
// These files share one database and wipe each other's rows, so run them
// with --test-concurrency=1 when BILLING_TEST_DATABASE_URL is set.

import test, { before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { handleRazorpayWebhook } from './webhook-handler.js'

const url = process.env.BILLING_TEST_DATABASE_URL
const opts = { skip: url ? false : 'BILLING_TEST_DATABASE_URL is not set' }

const SECRET = 'whsec_integration'
const SUB = 'sub_it_1'

let pool
let prisma

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
  await prisma.subscription.deleteMany()
  await prisma.workspace.deleteMany()
  const workspace = await prisma.workspace.create({ data: { name: 'Integration workspace' } })
  await prisma.subscription.create({
    data: {
      workspaceId: workspace.id,
      plan: 'PRO',
      billingCycle: 'MONTHLY',
      status: 'PENDING',
      razorpaySubscriptionId: SUB,
    },
  })
})

function request(event, eventId) {
  const rawBody = JSON.stringify(event)
  const signature = crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex')
  return { rawBody, signature, eventId, secret: SECRET }
}

function eventFor(type, subscriptionId = SUB, extra = {}) {
  return { event: type, payload: { subscription: { entity: { id: subscriptionId } } }, ...extra }
}

const ACTIVE = { id: SUB, status: 'active', paid_count: 1, current_start: 1_700_000_000, current_end: 1_702_592_000 }

function staticRazorpay(remote) {
  const log = { fetches: 0 }
  return {
    log,
    subscriptions: {
      fetch: async () => {
        log.fetches += 1
        if (remote instanceof Error) throw remote
        return remote
      },
    },
  }
}

function deliver(req, razorpay) {
  return handleRazorpayWebhook({ ...req, prisma, razorpay })
}

async function status() {
  return (await prisma.subscription.findUnique({ where: { razorpaySubscriptionId: SUB } })).status
}

test('a verified charge activates the subscription and records the event', opts, async () => {
  const razorpay = staticRazorpay(ACTIVE)
  const result = await deliver(request(eventFor('subscription.charged'), 'evt_1'), razorpay)

  assert.deepEqual(result, { status: 200, body: { status: 'processed' } })
  const sub = await prisma.subscription.findUnique({ where: { razorpaySubscriptionId: SUB } })
  assert.equal(sub.status, 'ACTIVE')
  assert.equal(sub.currentPeriodEnd.getTime(), 1_702_592_000 * 1000)

  const events = await prisma.webhookEvent.findMany()
  assert.equal(events.length, 1)
  assert.equal(events[0].status, 'PROCESSED')
  assert.match(events[0].bodyHash, /^[0-9a-f]{64}$/)
})

test('an event for an unpaid subscription never grants access', opts, async () => {
  for (const remote of [
    { ...ACTIVE, status: 'authenticated', paid_count: 0 },
    { ...ACTIVE, status: 'created', paid_count: 0 },
    { ...ACTIVE, status: 'active', paid_count: 0 },
  ]) {
    await deliver(request(eventFor('subscription.activated'), `evt_${crypto.randomUUID()}`), staticRazorpay(remote))
    assert.equal(await status(), 'PENDING', remote.status)
  }
})

test('replays are acknowledged and change nothing, even with a new event id', opts, async () => {
  const razorpay = staticRazorpay(ACTIVE)
  const first = request(eventFor('subscription.charged'), 'evt_1')
  await deliver(first, razorpay)

  const sameId = await deliver(first, razorpay)
  const newId = await deliver({ ...first, eventId: 'evt_forged_new_id' }, razorpay)

  assert.equal(sameId.body.status, 'duplicate')
  assert.equal(newId.body.status, 'duplicate')
  assert.equal(razorpay.log.fetches, 1)
  assert.equal(await prisma.webhookEvent.count(), 1)
})

test('a late stale event cannot downgrade a paid subscription', opts, async () => {
  await deliver(request(eventFor('subscription.charged'), 'evt_charged'), staticRazorpay(ACTIVE))
  assert.equal(await status(), 'ACTIVE')

  // Razorpay state is still active when the delayed pending event arrives.
  await deliver(request(eventFor('subscription.pending', SUB, { created_at: 1 }), 'evt_late_pending'), staticRazorpay(ACTIVE))
  assert.equal(await status(), 'ACTIVE')
})

test('concurrent events for one subscription are serialised and end on the latest Razorpay state', opts, async () => {
  const timeline = []
  let state = { ...ACTIVE, status: 'authenticated', paid_count: 0 }
  let call = 0
  const razorpay = {
    subscriptions: {
      fetch: async () => {
        const index = (call += 1)
        timeline.push(`start-${index}`)
        if (index === 1) {
          // Reads the pre-payment state, returns slowly; the customer pays meanwhile.
          const snapshot = state
          state = { ...ACTIVE }
          await new Promise((resolve) => setTimeout(resolve, 150))
          timeline.push(`end-${index}`)
          return snapshot
        }
        await new Promise((resolve) => setTimeout(resolve, 20))
        timeline.push(`end-${index}`)
        return state
      },
    },
  }

  const [a, b] = await Promise.all([
    deliver(request(eventFor('subscription.authenticated'), 'evt_a'), razorpay),
    deliver(request(eventFor('subscription.charged'), 'evt_b'), razorpay),
  ])

  assert.equal(a.status, 200)
  assert.equal(b.status, 200)
  assert.deepEqual(timeline, ['start-1', 'end-1', 'start-2', 'end-2'])
  assert.equal(await status(), 'ACTIVE')
  assert.equal(await prisma.webhookEvent.count(), 2)
})

test('concurrent duplicate deliveries of one event are applied once', opts, async () => {
  const razorpay = staticRazorpay(ACTIVE)
  const req = request(eventFor('subscription.charged'), 'evt_dup')
  const results = await Promise.all([deliver(req, razorpay), deliver(req, razorpay), deliver(req, razorpay)])

  assert.ok(results.every((r) => r.status === 200))
  assert.equal(results.filter((r) => r.body.status === 'processed').length, 1)
  assert.equal(await prisma.webhookEvent.count(), 1)
  assert.equal(await status(), 'ACTIVE')
})

test('a Razorpay outage rolls back, returns 500, and the retry is processed', opts, async (t) => {
  t.mock.method(console, 'error', () => {})
  const req = request(eventFor('subscription.charged'), 'evt_retry')

  const failed = await deliver(req, staticRazorpay(new Error('Razorpay unavailable')))
  assert.equal(failed.status, 500)
  assert.equal(await prisma.webhookEvent.count(), 0)
  assert.equal(await status(), 'PENDING')

  const retried = await deliver(req, staticRazorpay(ACTIVE))
  assert.deepEqual(retried, { status: 200, body: { status: 'processed' } })
  assert.equal(await status(), 'ACTIVE')
})

test('an event for an unknown subscription is persisted as UNMATCHED', opts, async (t) => {
  t.mock.method(console, 'error', () => {})
  const razorpay = staticRazorpay(ACTIVE)
  const result = await deliver(request(eventFor('subscription.charged', 'sub_unknown'), 'evt_unknown'), razorpay)

  assert.deepEqual(result, { status: 200, body: { status: 'unmatched' } })
  assert.equal(razorpay.log.fetches, 0)
  const events = await prisma.webhookEvent.findMany()
  assert.equal(events[0].status, 'UNMATCHED')
  assert.equal(await status(), 'PENDING')
})

test('every Razorpay status lands on the expected local status', opts, async () => {
  const expected = {
    authenticated: 'PENDING',
    active: 'ACTIVE',
    pending: 'PAST_DUE',
    halted: 'EXPIRED',
    cancelled: 'CANCELLED',
    completed: 'CANCELLED',
    expired: 'EXPIRED',
  }
  let createdAt = 1_700_000_000
  for (const [razorpayStatus, local] of Object.entries(expected)) {
    createdAt += 1
    const event = eventFor('subscription.updated', SUB, { created_at: createdAt })
    await deliver(request(event, `evt_${razorpayStatus}`), staticRazorpay({ ...ACTIVE, status: razorpayStatus }))
    assert.equal(await status(), local, razorpayStatus)
  }
})

test('the database raises P2002 for a duplicate event id', opts, async () => {
  const data = { razorpayEventId: 'evt_unique', eventType: 'subscription.charged' }
  await prisma.webhookEvent.create({ data })
  await assert.rejects(prisma.webhookEvent.create({ data }), (err) => err.code === 'P2002')
})