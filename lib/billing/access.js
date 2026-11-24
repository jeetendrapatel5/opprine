// lib/billing/access.js
//
// Pure rule for which plan a Subscription row currently grants.
// Anything not explicitly granted resolves to FREE.

export const PAST_DUE_GRACE_MS = 7 * 24 * 60 * 60 * 1000

export function resolveAccess(subscription, now = new Date()) {
  if (!subscription) return 'FREE'

  const periodEnd = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).getTime()
    : null
  const at = now.getTime()

  switch (subscription.status) {
    case 'ACTIVE':
      return subscription.plan
    // Failed renewal: Razorpay retries, so access continues for a bounded
    // grace window after the period that was not paid for.
    case 'PAST_DUE':
      return periodEnd !== null && at < periodEnd + PAST_DUE_GRACE_MS ? subscription.plan : 'FREE'
    // Cancelled: access runs to the end of the period already paid for.
    case 'CANCELLED':
      return periodEnd !== null && at < periodEnd ? subscription.plan : 'FREE'
    default:
      return 'FREE'
  }
}
