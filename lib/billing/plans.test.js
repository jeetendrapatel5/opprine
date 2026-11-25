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

const INTERNATIONAL_ENV = {
  RAZORPAY_INTERNATIONAL_ENABLED: 'true',
  RAZORPAY_PLAN_PRO_MONTHLY_USD: 'plan_pm_usd',
  RAZORPAY_PLAN_PRO_YEARLY_USD: 'plan_py_usd',
  RAZORPAY_PLAN_TEAM_MONTHLY_USD: 'plan_tm_usd',
  RAZORPAY_PLAN_TEAM_YEARLY_USD: 'plan_ty_usd',
}

// plans.js reads plan ids at import time and the enable flag at call time,
// so each scenario imports a fresh copy and holds its environment until done.
async function withPlans(env, tag, run) {
  const keys = Object.keys(INTERNATIONAL_ENV).concat('RAZORPAY_PLAN_PRO_MONTHLY_EUR')
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
  for (const key of keys) delete process.env[key]
  Object.assign(process.env, env)
  try {
    await run(await import(`./plans.js?${tag}`))
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  }
}

test('international billing is off by default and for incomplete configuration', async () => {
  await withPlans({}, 'off', (plans) => {
    assert.deepEqual(plans.getEnabledCurrencies(), ['INR'])
    assert.equal(plans.getPricing('PRO', 'MONTHLY', 'USD'), null)
  })
  await withPlans({ ...INTERNATIONAL_ENV, RAZORPAY_INTERNATIONAL_ENABLED: 'false' }, 'noflag', (plans) => {
    assert.deepEqual(plans.getEnabledCurrencies(), ['INR'])
  })
  await withPlans({ ...INTERNATIONAL_ENV, RAZORPAY_PLAN_TEAM_YEARLY_USD: '' }, 'partial', (plans) => {
    assert.deepEqual(plans.getEnabledCurrencies(), ['INR'])
  })
})

test('a fully configured currency is enabled and its plans carry no local amount', async () => {
  await withPlans(INTERNATIONAL_ENV, 'on', (plans) => {
    assert.deepEqual(plans.getEnabledCurrencies(), ['INR', 'USD'])
    assert.deepEqual(plans.getPricing('PRO', 'MONTHLY', 'USD'), { currency: 'USD', amount: null, razorpayPlanId: 'plan_pm_usd' })
    assert.equal(plans.isSelfServeAvailable('TEAM', 'YEARLY', 'USD'), true)
    assert.equal(plans.isSelfServeAvailable('TEAM', 'YEARLY', 'INR'), false)
    assert.equal(plans.getPricing('PRO', 'MONTHLY', 'EUR'), null)
    assert.equal(plans.getPricing('PRO', 'MONTHLY', 'GBP'), null)
  })
})
