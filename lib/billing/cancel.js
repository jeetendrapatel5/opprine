// lib/billing/cancel.js
//
// Cancels a workspace subscription at Razorpay and reflects the resulting
// state locally. Local state comes from a sync after the call, not from
// the request, and a Razorpay rejection for an already-ended subscription
// is reported as such.

import { syncSubscriptionState } from './subscription-sync.js'

const TRANSACTION_OPTIONS = { maxWait: 5000, timeout: 20000 }
const ENDED_STATUSES = ['CANCELLED', 'EXPIRED']

function isRazorpayClientError(error) {
  const status = error?.statusCode
  return typeof status === 'number' && status >= 400 && status < 500 && status !== 401 && status !== 403
}

export async function cancelSubscription({ prisma, razorpay, subscription, immediately }) {
  const id = subscription.razorpaySubscriptionId
  // Razorpay has no billing cycle to defer to before the first payment.
  const cancelAtCycleEnd = subscription.status === 'PENDING' ? false : !immediately

  const sync = () => prisma.$transaction((tx) => syncSubscriptionState(tx, razorpay, id), TRANSACTION_OPTIONS)

  try {
    // The SDK takes a boolean; an options object is always truthy and
    // would force cancel_at_cycle_end on every call.
    await razorpay.subscriptions.cancel(id, cancelAtCycleEnd)
  } catch (error) {
    if (!isRazorpayClientError(error)) throw error
    await sync()
    const current = await prisma.subscription.findUnique({ where: { id: subscription.id } })
    if (current && ENDED_STATUSES.includes(current.status)) {
      return { status: 400, body: { error: 'This subscription is already cancelled.' } }
    }
    throw error
  }

  // If the refresh fails, record the requested intent and leave the rest
  // to the next webhook or reconciliation.
  try {
    await sync()
  } catch (error) {
    console.error('Subscription refresh after cancel failed:', error?.message ?? error)
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: cancelAtCycleEnd
        ? { cancelAtPeriodEnd: true }
        : { status: 'CANCELLED', cancelAtPeriodEnd: false, currentPeriodEnd: new Date() },
    })
  }

  const updated = await prisma.subscription.findUnique({ where: { id: subscription.id } })
  return {
    status: 200,
    body: {
      status: 'ok',
      cancelledImmediately: !cancelAtCycleEnd,
      accessUntil: cancelAtCycleEnd ? updated.currentPeriodEnd : null,
    },
  }
}