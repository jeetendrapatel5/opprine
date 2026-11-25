// lib/billing/checkout.js
//
// Creates (or reuses) the Razorpay subscription for a checkout. The
// workspace's Subscription row is never written here: a checkout attempt
// is recorded separately and promoted by the webhook sync once paid.

import { ConflictError } from '../errors.js'

export const TOTAL_COUNT_BY_CYCLE = { MONTHLY: 120, YEARLY: 10 }
export const ATTEMPT_REUSE_WINDOW_MS = 24 * 60 * 60 * 1000
const LIVE_STATUSES = ['ACTIVE', 'PAST_DUE']
const TRANSACTION_OPTIONS = { maxWait: 5000, timeout: 20000 }

export async function createCheckout({ prisma, razorpay, workspaceId, plan, billingCycle, pricing, now = new Date() }) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'workspace:' + workspaceId}))`

    const subscription = await tx.subscription.findUnique({ where: { workspaceId } })
    if (subscription?.razorpaySubscriptionId && LIVE_STATUSES.includes(subscription.status)) {
      throw new ConflictError(
        'This workspace already has an active subscription. Cancel it before subscribing to a different plan.'
      )
    }

    const open = await tx.checkoutAttempt.findMany({ where: { workspaceId, status: 'CREATED' } })
    const cutoff = now.getTime() - ATTEMPT_REUSE_WINDOW_MS
    const reusable = open.find(
      (a) =>
        a.plan === plan &&
        a.billingCycle === billingCycle &&
        a.razorpayPlanId === pricing.razorpayPlanId &&
        a.createdAt.getTime() >= cutoff
    )
    if (reusable) return { subscriptionId: reusable.razorpaySubscriptionId }

    const remote = await razorpay.subscriptions.create({
      plan_id: pricing.razorpayPlanId,
      customer_notify: 1,
      total_count: TOTAL_COUNT_BY_CYCLE[billingCycle],
      quantity: 1,
      notes: { workspaceId },
    })

    // Earlier open attempts stay payable on Razorpay's side; they are
    // still honoured by the webhook sync if one is paid later.
    await tx.checkoutAttempt.create({
      data: {
        workspaceId,
        plan,
        billingCycle,
        razorpayPlanId: pricing.razorpayPlanId,
        razorpaySubscriptionId: remote.id,
      },
    })
    return { subscriptionId: remote.id }
  }, TRANSACTION_OPTIONS)
}