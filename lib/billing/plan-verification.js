// lib/billing/plan-verification.js
//
// Confirms that the Razorpay plan behind a configured plan id charges the
// amount, currency and interval the app displays, so a mis-set env var
// can never bill a different price.

const PERIOD_BY_CYCLE = { MONTHLY: 'monthly', YEARLY: 'yearly' }
const EXPECTED_CURRENCY = 'INR'

export async function assertRazorpayPlanMatches(razorpay, pricing, billingCycle) {
  const remote = await razorpay.plans.fetch(pricing.razorpayPlanId)

  const mismatches = []
  if (remote?.item?.amount !== pricing.amount) {
    mismatches.push(`amount ${remote?.item?.amount} != ${pricing.amount}`)
  }
  if (remote?.item?.currency !== EXPECTED_CURRENCY) {
    mismatches.push(`currency ${remote?.item?.currency} != ${EXPECTED_CURRENCY}`)
  }
  if (remote?.period !== PERIOD_BY_CYCLE[billingCycle] || remote?.interval !== 1) {
    mismatches.push(`interval ${remote?.interval} ${remote?.period} != 1 ${PERIOD_BY_CYCLE[billingCycle]}`)
  }

  if (mismatches.length > 0) {
    throw new Error(`Razorpay plan ${pricing.razorpayPlanId} does not match configured pricing: ${mismatches.join('; ')}`)
  }
}