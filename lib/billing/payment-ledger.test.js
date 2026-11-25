// lib/billing/payment-ledger.test.js
//
// Run with:  node --test lib/billing/payment-ledger.test.js

import test from 'node:test'
import assert from 'node:assert/strict'
import { extractPaymentRef, mapPaymentStatus } from './payment-ledger.js'

test('payment status mapping covers refunds and rejects unknown values', () => {
  assert.equal(mapPaymentStatus({ status: 'created' }), 'CREATED')
  assert.equal(mapPaymentStatus({ status: 'authorized' }), 'AUTHORIZED')
  assert.equal(mapPaymentStatus({ status: 'failed' }), 'FAILED')
  assert.equal(mapPaymentStatus({ status: 'captured', amount: 1000, amount_refunded: 0 }), 'CAPTURED')
  assert.equal(mapPaymentStatus({ status: 'captured', amount: 1000, amount_refunded: 400 }), 'PARTIALLY_REFUNDED')
  assert.equal(mapPaymentStatus({ status: 'captured', amount: 1000, amount_refunded: 1000 }), 'REFUNDED')
  assert.equal(mapPaymentStatus({ status: 'refunded', amount: 1000, amount_refunded: 1000 }), 'REFUNDED')
  assert.throws(() => mapPaymentStatus({ status: 'mystery' }), /Unknown Razorpay payment status/)
})

test('payment references are found on payment, refund and dispute events', () => {
  assert.equal(extractPaymentRef({ event: 'payment.failed', payload: { payment: { entity: { id: 'pay_1' } } } }).paymentId, 'pay_1')
  assert.equal(extractPaymentRef({ event: 'refund.processed', payload: { refund: { entity: { payment_id: 'pay_2' } } } }).paymentId, 'pay_2')

  const dispute = { id: 'disp_1', payment_id: 'pay_3', status: 'open' }
  const ref = extractPaymentRef({ event: 'payment.dispute.created', created_at: 1_700_000_000, payload: { dispute: { entity: dispute } } })
  assert.equal(ref.paymentId, 'pay_3')
  assert.equal(ref.dispute.id, 'disp_1')
  assert.equal(ref.eventAt.getTime(), 1_700_000_000 * 1000)
})

test('the subscription id is carried when the event includes one', () => {
  const ref = extractPaymentRef({
    event: 'subscription.charged',
    payload: { payment: { entity: { id: 'pay_4' } }, subscription: { entity: { id: 'sub_9' } } },
  })
  assert.equal(ref.subscriptionId, 'sub_9')
  assert.equal(ref.dispute, null)
})

test('events without a payment entity yield no reference', () => {
  assert.equal(extractPaymentRef({ event: 'subscription.paused', payload: { subscription: { entity: { id: 'sub_1' } } } }), null)
  assert.equal(extractPaymentRef({ event: 'x' }), null)
})
