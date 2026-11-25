// lib/billing/display-prices.test.js
//
// Run with:  node --test lib/billing/display-prices.test.js

import test from 'node:test'
import assert from 'node:assert/strict'
import { getDisplayOffers, clearDisplayPriceCache } from './display-prices.js'

test('with international billing off only INR is offered and Razorpay is not called', async () => {
  clearDisplayPriceCache()
  const razorpay = { plans: { fetch: async () => assert.fail('must not fetch') } }
  const { currencies, offers } = await getDisplayOffers(razorpay)

  assert.deepEqual(currencies, ['INR'])
  assert.equal(offers.PRO.INR.MONTHLY.amount, 99900)
  assert.equal(offers.PRO.INR.YEARLY.available, true)
  assert.equal(offers.TEAM.INR.YEARLY.available, false)
})
