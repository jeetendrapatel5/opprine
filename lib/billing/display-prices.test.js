// lib/billing/display-prices.test.js
//
// Run with:  node --test lib/billing/display-prices.test.js

import test from 'node:test'
import assert from 'node:assert/strict'
import { getDisplayOffers } from './display-prices.js'

const KEYS = ['RAZORPAY_INTERNATIONAL_ENABLED', 'RAZORPAY_PLAN_PRO_MONTHLY_USD', 'RAZORPAY_PLAN_TEAM_MONTHLY_USD']

function withEnv(env, run) {
  const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]))
  for (const key of KEYS) delete process.env[key]
  Object.assign(process.env, env)
  try {
    run()
  } finally {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  }
}

test('nothing is offered until USD billing is configured', () => {
  withEnv({}, () => {
    const { currencies } = getDisplayOffers()
    assert.deepEqual(currencies, [])
  })
})

test('configured USD billing lists the catalog amounts', () => {
  withEnv(
    { RAZORPAY_INTERNATIONAL_ENABLED: 'true', RAZORPAY_PLAN_PRO_MONTHLY_USD: 'p1', RAZORPAY_PLAN_TEAM_MONTHLY_USD: 'p2' },
    () => {
      const { currencies, offers } = getDisplayOffers()
      assert.deepEqual(currencies, ['USD'])
      assert.deepEqual(offers.PRO.USD, { MONTHLY: { amount: 2900, available: true } })
      assert.deepEqual(offers.TEAM.USD, { MONTHLY: { amount: 7900, available: true } })
    }
  )
})
