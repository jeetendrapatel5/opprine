// lib/billing/display-prices.js
//
// Prices shown on the billing page. INR comes from plans.js. International
// prices are read from the Razorpay plans and held in memory for a short
// time, so the page does not call Razorpay on every load.

import { PLAN_CONFIG, getPricing, isSelfServeAvailable, getEnabledCurrencies, BASE_CURRENCY } from './plans.js'
import { withTimeout } from './subscription-sync.js'

const CACHE_TTL_MS = 10 * 60 * 1000
const FETCH_TIMEOUT_MS = 5000
const CYCLES = ['MONTHLY', 'YEARLY']
const cache = new Map()

async function fetchPlanAmount(razorpay, pricing, now) {
  const hit = cache.get(pricing.razorpayPlanId)
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.amount

  const remote = await withTimeout(razorpay.plans.fetch(pricing.razorpayPlanId), FETCH_TIMEOUT_MS)
  if (remote?.item?.currency !== pricing.currency || !Number.isInteger(remote?.item?.amount)) return null

  cache.set(pricing.razorpayPlanId, { amount: remote.item.amount, at: now })
  return remote.item.amount
}

// Returns { currencies: ['INR', ...], offers: { PRO: { INR: { MONTHLY: { amount, available }}}}}.
// A currency whose prices cannot be read is left out entirely rather than
// shown with a missing price.
export async function getDisplayOffers(razorpay, now = Date.now()) {
  const selfServe = Object.keys(PLAN_CONFIG).filter((key) => PLAN_CONFIG[key].pricing)
  const offers = Object.fromEntries(selfServe.map((plan) => [plan, {}]))
  const currencies = []

  for (const currency of getEnabledCurrencies()) {
    try {
      const rows = {}
      for (const plan of selfServe) {
        rows[plan] = {}
        for (const cycle of CYCLES) {
          const pricing = getPricing(plan, cycle, currency)
          const amount = currency === BASE_CURRENCY ? pricing.amount : await fetchPlanAmount(razorpay, pricing, now)
          if (amount === null) throw new Error(`No readable price for ${plan} ${cycle} ${currency}`)
          rows[plan][cycle] = { amount, available: isSelfServeAvailable(plan, cycle, currency) }
        }
      }
      for (const plan of selfServe) offers[plan][currency] = rows[plan]
      currencies.push(currency)
    } catch (error) {
      console.error('Billing currency unavailable:', { currency, message: error?.message ?? error })
    }
  }
  return { currencies, offers }
}

export function clearDisplayPriceCache() {
  cache.clear()
}
