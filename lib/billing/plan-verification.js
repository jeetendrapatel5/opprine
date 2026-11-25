// lib/billing/plan-verification.js
//
// Confirms that the Razorpay plan behind a configured plan id bills in the
// expected currency and interval and, when the app holds a price for it
// (INR), the same amount. International plans carry no local amount: the
// Razorpay plan is the price, so only currency and interval are checked.

const PERIOD_BY_CYCLE = { MONTHLY: 'monthly', YEARLY: 'yearly' }

export async function assertRazorpayPlanMatches(razorpay, pricing, billingCycle) {
  const remote = await razorpay.plans.fetch(pricing.razorpayPlanId)

  const mismatches = []
  if (typeof pricing.amount === 'number' && remote?.item?.amount !== pricing.amount) {
    mismatches.push(`amount ${remote?.item?.amount} != ${pricing.amount}`)
  }
  if (remote?.item?.currency !== pricing.currency) {
    mismatches.push(`currency ${remote?.item?.currency} != ${pricing.currency}`)
  }
  if (!Number.isInteger(remote?.item?.amount) || remote.item.amount <= 0) {
    mismatches.push(`amount ${remote?.item?.amount} is not a positive integer`)
  }
  if (remote?.period !== PERIOD_BY_CYCLE[billingCycle] || remote?.interval !== 1) {
    mismatches.push(`interval ${remote?.interval} ${remote?.period} != 1 ${PERIOD_BY_CYCLE[billingCycle]}`)
  }

  if (mismatches.length > 0) {
    throw new Error(`Razorpay plan ${pricing.razorpayPlanId} does not match configured pricing: ${mismatches.join('; ')}`)
  }
}
