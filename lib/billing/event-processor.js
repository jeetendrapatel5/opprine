// lib/billing/event-processor.js
//
// Applies one verified Razorpay event inside a transaction: refreshes the
// subscription it names and records the payment it names. Shared by the
// webhook handler and the retry of unmatched events.

import { syncSubscriptionState } from './subscription-sync.js'
import { extractPaymentRef, syncPayment } from './payment-ledger.js'

export async function applyEvent(tx, razorpay, event) {
  const subscriptionId = event.payload?.subscription?.entity?.id ?? null
  const paymentRef = extractPaymentRef(event)

  let status = 'IGNORED'
  const alerts = []

  if (subscriptionId) status = await syncSubscriptionState(tx, razorpay, subscriptionId)
  if (paymentRef) {
    alerts.push(...(await syncPayment(tx, razorpay, paymentRef)))
    if (status === 'IGNORED') status = 'PROCESSED'
  }
  if (status === 'UNMATCHED') {
    alerts.push({ kind: 'UNMATCHED_EVENT', eventType: event.event, subscriptionId })
  }
  return { status, alerts, subscriptionId }
}
