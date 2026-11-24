// lib/billing/plans.test.js
//
// Run with:  node --test lib/billing/plans.test.js

import test from 'node:test'
import assert from 'node:assert/strict'
import { PLAN_CONFIG, MAX_RECURRING_AMOUNT_PAISE, isSelfServeAvailable } from './plans.js'
import { PRICING_TIERS, FINAL_CTA, FINAL_NOTE } from '../../components/landing/data.js'
import { formatINR, formatLimit } from './format.js'

test('a charge above the Razorpay mandate maximum is not self-serve', () => {
  assert.equal(MAX_RECURRING_AMOUNT_PAISE, 1_500_000)
  assert.equal(isSelfServeAvailable('PRO', 'MONTHLY'), true)
  assert.equal(isSelfServeAvailable('PRO', 'YEARLY'), true)
  assert.equal(isSelfServeAvailable('TEAM', 'MONTHLY'), true)
  assert.equal(isSelfServeAvailable('TEAM', 'YEARLY'), false)
})

test('plans without self-serve pricing are never available', () => {
  assert.equal(isSelfServeAvailable('FREE', 'MONTHLY'), false)
  assert.equal(isSelfServeAvailable('ENTERPRISE', 'YEARLY'), false)
})

test('the landing page shows the plans, prices and limits that are actually billed', () => {
  const byName = Object.fromEntries(PRICING_TIERS.map((tier) => [tier.name, tier]))
  assert.deepEqual(Object.keys(byName), ['Free', 'Pro', 'Team'])

  assert.equal(byName.Free.price, '₹0')
  for (const key of ['PRO', 'TEAM']) {
    const config = PLAN_CONFIG[key]
    assert.equal(byName[config.displayName].price, formatINR(config.pricing.monthly.amount).replace(/\s/g, ''))
  }

  for (const key of ['FREE', 'PRO', 'TEAM']) {
    const { displayName, limits } = PLAN_CONFIG[key]
    const text = byName[displayName].features.join(' | ')
    for (const limitKey of ['maxProjects', 'maxClients', 'maxWorkspaceMembers']) {
      const shown = limits[limitKey] === Infinity ? 'Unlimited' : String(limits[limitKey])
      assert.ok(text.includes(shown), `${displayName} ${limitKey}: ${shown} in "${text}"`)
    }
    assert.equal(text.includes('GitHub'), limits.githubIntegration)
    assert.equal(text.includes('branding'), limits.customBranding)
  }
  assert.equal(formatLimit(Infinity), 'Unlimited')
})

test('no landing copy promises a trial that billing does not provide', () => {
  const copy = JSON.stringify(PRICING_TIERS) + FINAL_CTA + FINAL_NOTE
  assert.doesNotMatch(copy, /trial/i)
})
