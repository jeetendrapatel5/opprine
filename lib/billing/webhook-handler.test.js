// lib/billing/webhook-handler.test.js
//
// Run with:  node --test lib/billing/webhook-handler.test.js
// Database behaviour (locking, rollback, unique constraints) is covered
// by webhook-handler.integration.test.js.

import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { handleRazorpayWebhook } from './webhook-handler.js'
import { hashWebhookBody } from './webhook-signature.js'

const SECRET = 'whsec_test_secret'
const SUB = 'sub_test_1'

function signedRequest(event, { eventId = 'evt_1', secret = SECRET } = {}) {
  const rawBody = JSON.stringify(event)
  const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return { rawBody, signature, eventId, secret: SECRET }
}

const chargedEvent = { event: 'subscription.charged', payload: { subscription: { entity: { id: SUB } } } }

function harness({ seen = null, local = { id: 'local_1' }, remote, createError } = {}) {
  const log = { fetches: 0, updates: [], created: [] }
  const tx = {
    $executeRaw: async () => {},
    checkoutAttempt: { findUnique: async () => null, findFirst: async () => null },
    subscription: {
      findUnique: async () => local,
      update: async ({ data }) => log.updates.push(data),
    },
    webhookEvent: {
      create: async ({ data }) => {
        if (createError) throw createError
        log.created.push(data)
      },
    },
  }
  const prisma = {
    webhookEvent: { findFirst: async () => seen },
    $transaction: async (fn) => fn(tx),
  }
  const razorpay = {
    subscriptions: {
      fetch: async () => {
        log.fetches += 1
        if (remote instanceof Error) throw remote
        return remote ?? { id: SUB, status: 'active', paid_count: 1, current_start: 1_700_000_000, current_end: 1_702_592_000 }
      },
    },
  }
  return { log, prisma, razorpay }
}

async function run(request, deps) {
  return handleRazorpayWebhook({ ...request, ...deps })
}

test('missing signature or event id returns 400 before touching anything', async () => {
  const h = harness()
  const request = signedRequest(chargedEvent)
  assert.equal((await run({ ...request, signature: null }, h)).status, 400)
  assert.equal((await run({ ...request, eventId: null }, h)).status, 400)
  assert.equal(h.log.fetches, 0)
})

test('an unset or empty webhook secret returns 500 and never accepts a forged signature', async () => {
  const h = harness()
  const forged = signedRequest(chargedEvent, { secret: '' })
  for (const secret of [undefined, '']) {
    const result = await run({ ...forged, secret }, h)
    assert.equal(result.status, 500)
  }
  assert.equal(h.log.created.length, 0)
  assert.equal(h.log.updates.length, 0)
})

test('an invalid signature returns 400 and changes nothing', async () => {
  const h = harness()
  const request = signedRequest(chargedEvent, { secret: 'wrong_secret' })
  assert.equal((await run(request, h)).status, 400)
  assert.equal(h.log.fetches, 0)
  assert.equal(h.log.created.length, 0)
})

test('a signed body that is not a JSON event object returns 400', async () => {
  const h = harness()
  for (const body of ['not json', 'null', '[]', '{"event":5}']) {
    const signature = crypto.createHmac('sha256', SECRET).update(body).digest('hex')
    const result = await run({ rawBody: body, signature, eventId: 'evt_x', secret: SECRET }, h)
    assert.equal(result.status, 400, body)
  }
})

test('a charge event syncs from Razorpay state and records the event with the body hash', async () => {
  const h = harness()
  const request = signedRequest(chargedEvent)
  const result = await run(request, h)

  assert.deepEqual(result, { status: 200, body: { status: 'processed' } })
  assert.equal(h.log.fetches, 1)
  assert.equal(h.log.updates[0].status, 'ACTIVE')
  assert.equal(h.log.created[0].bodyHash, hashWebhookBody(request.rawBody))
  assert.equal(h.log.created[0].razorpayEventId, 'evt_1')
  assert.equal(h.log.created[0].status, 'PROCESSED')
})

test('the event body cannot force a status: Razorpay state decides', async () => {
  const h = harness({ remote: { id: SUB, status: 'pending', paid_count: 3 } })
  await run(signedRequest(chargedEvent), h)
  assert.equal(h.log.updates[0].status, 'PAST_DUE')
})

test('an already-seen event is acknowledged without a fetch or a write', async () => {
  const h = harness({ seen: { id: 'existing' } })
  const result = await run(signedRequest(chargedEvent), h)
  assert.deepEqual(result, { status: 200, body: { status: 'duplicate' } })
  assert.equal(h.log.fetches, 0)
  assert.equal(h.log.created.length, 0)
})

test('an unknown subscription is recorded as UNMATCHED and acknowledged', async (t) => {
  t.mock.method(console, 'error', () => {})
  const h = harness({ local: null })
  const result = await run(signedRequest(chargedEvent), h)

  assert.deepEqual(result, { status: 200, body: { status: 'unmatched' } })
  assert.equal(h.log.created[0].status, 'UNMATCHED')
  assert.equal(h.log.fetches, 0)
  assert.equal(h.log.updates.length, 0)
})

test('an event without a subscription entity is recorded as IGNORED', async () => {
  const h = harness()
  const result = await run(signedRequest({ event: 'payment.failed', payload: { payment: { entity: { id: 'pay_1' } } } }), h)

  assert.deepEqual(result, { status: 200, body: { status: 'ignored' } })
  assert.equal(h.log.created[0].status, 'IGNORED')
  assert.equal(h.log.fetches, 0)
})

test('a Razorpay failure returns 500 and records no event', async (t) => {
  t.mock.method(console, 'error', () => {})
  const h = harness({ remote: Object.assign(new Error('boom'), { statusCode: 502 }) })
  const result = await run(signedRequest(chargedEvent), h)

  assert.equal(result.status, 500)
  assert.equal(h.log.created.length, 0)
  assert.equal(h.log.updates.length, 0)
})

test('a unique-constraint violation on insert is treated as a duplicate delivery', async () => {
  const h = harness({ createError: Object.assign(new Error('unique'), { code: 'P2002' }) })
  const result = await run(signedRequest(chargedEvent), h)
  assert.deepEqual(result, { status: 200, body: { status: 'duplicate' } })
})

test('any other database error returns 500 so Razorpay retries', async (t) => {
  t.mock.method(console, 'error', () => {})
  const h = harness({ createError: new Error('connection lost') })
  const result = await run(signedRequest(chargedEvent), h)
  assert.equal(result.status, 500)
})