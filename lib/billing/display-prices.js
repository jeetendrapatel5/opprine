// lib/billing/display-prices.js
//
// Prices shown on the billing page, read from the catalog in plans.js. The
// Razorpay plan behind each price is verified at checkout, so the page needs
// no network call.

import { PLAN_CONFIG, getPricing, isSelfServeAvailable, getEnabledCurrencies, getCycles } from './plans.js'

// Returns { currencies: ['USD'], offers: { PRO: { USD: { MONTHLY: { amount, available } } } } }.
export function getDisplayOffers() {
  const selfServe = Object.keys(PLAN_CONFIG).filter((key) => PLAN_CONFIG[key].pricing)
  const offers = Object.fromEntries(selfServe.map((plan) => [plan, {}]))
  const currencies = getEnabledCurrencies()

  for (const currency of currencies) {
    for (const plan of selfServe) {
      offers[plan][currency] = {}
      for (const cycle of getCycles(currency)) {
        offers[plan][currency][cycle] = {
          amount: getPricing(plan, cycle, currency).amount,
          available: isSelfServeAvailable(plan, cycle, currency),
        }
      }
    }
  }
  return { currencies, offers }
}
