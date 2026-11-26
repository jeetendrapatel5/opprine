// lib/billing/plans.test.js
//
// Run with:  node --test lib/billing/plans.test.js

import test from 'node:test'
import assert from 'node:assert/strict'
import { PLAN_CONFIG, PRICE_CATALOG } from './plans.js'
import { PRICING_TIERS, FINAL_CTA, FINAL_NOTE, HERO_CTA } from '../../components/landing/data.js'
import { formatMoney, formatLimit } from './format.js'

const ENV = {
  RAZORPAY_INTERNATIONAL_ENABLED: 'true',
  RAZORPAY_PLAN_PRO_MONTHLY_USD: 'plan_pm_usd',
  RAZORPAY_PLAN_TEAM_MONTHLY_USD: 'plan_tm_usd',
}

// Plan ids and the enable flag are read at call time; each scenario holds
// its environment until its assertions finish.
async function withEnv(env, run) {
  const keys = Object.keys(ENV).concat('RAZORPAY_PLAN_PRO_YEARLY_USD')
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
  for (const key of keys) delete process.env[key]
  Object.assign(process.env, env)
  try {
    await run(await import('./plans.js'))
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  }
}

test('the catalog prices Pro at $29 and Team at $79, monthly only', () => {
  assert.deepEqual(PRICE_CATALOG, { USD: { PRO: { MONTHLY: 2900 }, TEAM: { MONTHLY: 7900 } } })
})

test('billing is unavailable until international billing is enabled and plan ids are set', async () => {
  await withEnv({}, (plans) => {
    assert.deepEqual(plans.getEnabledCurrencies(), [])
    assert.equal(plans.getPricing('PRO', 'MONTHLY'), null)
  })
  await withEnv({ ...ENV, RAZORPAY_INTERNATIONAL_ENABLED: 'false' }, (plans) => {
    assert.deepEqual(plans.getEnabledCurrencies(), [])
  })
  await withEnv({ ...ENV, RAZORPAY_PLAN_TEAM_MONTHLY_USD: '' }, (plans) => {
    assert.deepEqual(plans.getEnabledCurrencies(), [])
    assert.equal(plans.isSelfServeAvailable('PRO', 'MONTHLY'), true)
    assert.equal(plans.isSelfServeAvailable('TEAM', 'MONTHLY'), false)
  })
})

test('a fully configured USD catalog is purchasable with its catalog amount', async () => {
  await withEnv(ENV, (plans) => {
    assert.deepEqual(plans.getEnabledCurrencies(), ['USD'])
    assert.deepEqual(plans.getPricing('PRO', 'MONTHLY'), { currency: 'USD', amount: 2900, razorpayPlanId: 'plan_pm_usd' })
    assert.deepEqual(plans.getPricing('TEAM', 'MONTHLY', 'USD'), { currency: 'USD', amount: 7900, razorpayPlanId: 'plan_tm_usd' })
    assert.deepEqual(plans.getCycles('USD'), ['MONTHLY'])
  })
})

test('combinations outside the catalog are never available', async () => {
  await withEnv({ ...ENV, RAZORPAY_PLAN_PRO_YEARLY_USD: 'plan_py_usd' }, (plans) => {
    assert.equal(plans.getPricing('PRO', 'YEARLY', 'USD'), null)
    assert.equal(plans.getPricing('PRO', 'MONTHLY', 'EUR'), null)
    assert.equal(plans.getPricing('PRO', 'MONTHLY', 'INR'), null)
    assert.equal(plans.isSelfServeAvailable('FREE', 'MONTHLY'), false)
    assert.equal(plans.isSelfServeAvailable('ENTERPRISE', 'MONTHLY'), false)
  })
})

test('the landing page shows the plans, prices and limits that are actually billed', () => {
  const byName = Object.fromEntries(PRICING_TIERS.map((tier) => [tier.name, tier]))
  assert.deepEqual(Object.keys(byName), ['Pro', 'Team'])

  for (const key of ['PRO', 'TEAM']) {
    const config = PLAN_CONFIG[key]
    assert.equal(byName[config.displayName].price, formatMoney(PRICE_CATALOG.USD[key].MONTHLY, 'USD'))
    const text = byName[config.displayName].features.join(' | ')
    for (const limitKey of ['maxProjects', 'maxClients', 'maxWorkspaceMembers']) {
      const shown = config.limits[limitKey] === Infinity ? 'Unlimited' : String(config.limits[limitKey])
      assert.ok(text.includes(shown), `${config.displayName} ${limitKey}: ${shown} in "${text}"`)
    }
    assert.equal(text.includes('GitHub'), config.limits.githubIntegration)
    assert.equal(text.includes('branding'), config.limits.customBranding)
  }
  assert.equal(formatLimit(Infinity), 'Unlimited')
})

test('no landing copy promises a free plan or trial', () => {
  const copy = JSON.stringify(PRICING_TIERS) + FINAL_CTA + FINAL_NOTE + HERO_CTA
  assert.doesNotMatch(copy, /\btrial\b|\bfree\b/i)
})
