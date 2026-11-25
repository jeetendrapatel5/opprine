// lib/billing/reconcile.js
//
// Daily safety net for everything the webhook path can miss: dropped or
// expired deliveries, events that arrived before their subscription was
// known, and payments whose events never arrived. Every function works
// from the Razorpay API and is safe to run repeatedly.

import { Prisma } from '@prisma/client'
import { syncSubscriptionState } from './subscription-sync.js'
import { applyEvent } from './event-processor.js'
import { syncPayment } from './payment-ledger.js'

const DAY_MS = 24 * 60 * 60 * 1000
const TRANSACTION_OPTIONS = { maxWait: 5000, timeout: 20000 }

function message(error) {
  return error?.error?.description ?? error?.message ?? String(error)
}

export async function reconcileSubscriptions({ prisma, razorpay, now = new Date(), limit = 200 }) {
  const candidates = await prisma.subscription.findMany({
    where: {
      razorpaySubscriptionId: { not: null },
      OR: [
        { status: { in: ['ACTIVE', 'PAST_DUE'] } },
        { status: 'PENDING', createdAt: { gte: new Date(now.getTime() - 30 * DAY_MS) } },
      ],
    },
    orderBy: { updatedAt: 'asc' },
    take: limit,
    select: { razorpaySubscriptionId: true },
  })

  const failures = []
  for (const { razorpaySubscriptionId } of candidates) {
    try {
      await prisma.$transaction((tx) => syncSubscriptionState(tx, razorpay, razorpaySubscriptionId), TRANSACTION_OPTIONS)
    } catch (error) {
      failures.push({ subscriptionId: razorpaySubscriptionId, message: message(error) })
    }
  }
  return { checked: candidates.length, failures }
}

export async function retryUnmatchedEvents({
  prisma,
  razorpay,
  now = new Date(),
  limit = 50,
  minAgeMs = 10 * 60 * 1000,
  maxAgeMs = 30 * DAY_MS,
}) {
  const events = await prisma.webhookEvent.findMany({
    where: {
      status: 'UNMATCHED',
      payload: { not: Prisma.DbNull },
      processedAt: { lte: new Date(now.getTime() - minAgeMs), gte: new Date(now.getTime() - maxAgeMs) },
    },
    orderBy: { processedAt: 'asc' },
    take: limit,
  })

  const alerts = []
  const failures = []
  let resolved = 0
  for (const stored of events) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const applied = await applyEvent(tx, razorpay, stored.payload)
        if (applied.status !== 'UNMATCHED') {
          await tx.webhookEvent.update({ where: { id: stored.id }, data: { status: applied.status } })
        }
        return applied
      }, TRANSACTION_OPTIONS)
      if (result.status !== 'UNMATCHED') resolved += 1
      // The unmatched alert was raised when the event first arrived.
      alerts.push(...result.alerts.filter((alert) => alert.kind !== 'UNMATCHED_EVENT'))
    } catch (error) {
      failures.push({ eventId: stored.razorpayEventId, message: message(error) })
    }
  }
  return { retried: events.length, resolved, alerts, failures }
}

export async function reconcilePayments({
  prisma,
  razorpay,
  now = new Date(),
  lookbackMs = 3 * DAY_MS,
  pageSize = 100,
  maxPages = 20,
}) {
  const from = Math.floor((now.getTime() - lookbackMs) / 1000)
  const to = Math.floor(now.getTime() / 1000)

  const alerts = []
  const failures = []
  let seen = 0
  for (let page = 0; page < maxPages; page += 1) {
    const result = await razorpay.payments.all({ from, to, count: pageSize, skip: page * pageSize })
    const items = result?.items ?? []
    for (const payment of items) {
      seen += 1
      try {
        const found = await prisma.$transaction(
          (tx) => syncPayment(tx, razorpay, { paymentId: payment.id, subscriptionId: null, dispute: null, eventAt: null }, { remote: payment }),
          TRANSACTION_OPTIONS
        )
        alerts.push(...found)
      } catch (error) {
        failures.push({ paymentId: payment.id, message: message(error) })
      }
    }
    if (items.length < pageSize) break
  }
  return { seen, alerts, failures }
}

export async function purgeOldPayloads({ prisma, now = new Date(), retentionMs = 90 * DAY_MS }) {
  const { count } = await prisma.webhookEvent.updateMany({
    where: { processedAt: { lt: new Date(now.getTime() - retentionMs) }, payload: { not: Prisma.DbNull } },
    data: { payload: Prisma.DbNull },
  })
  return { purged: count }
}

export async function runBillingReconcile(deps) {
  const subscriptions = await reconcileSubscriptions(deps)
  const events = await retryUnmatchedEvents(deps)
  const payments = await reconcilePayments(deps)
  const retention = await purgeOldPayloads(deps)

  const failures = [...subscriptions.failures, ...events.failures, ...payments.failures]
  const alerts = [...events.alerts, ...payments.alerts]
  if (failures.length > 0) alerts.push({ kind: 'RECONCILE_FAILURES', count: failures.length, sample: failures.slice(0, 10) })

  return {
    summary: {
      subscriptionsChecked: subscriptions.checked,
      eventsRetried: events.retried,
      eventsResolved: events.resolved,
      paymentsSeen: payments.seen,
      payloadsPurged: retention.purged,
      failures: failures.length,
    },
    alerts,
  }
}
