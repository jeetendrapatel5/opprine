// lib/billing/plans.js

const UNLIMITED = Infinity

export const PLAN_CONFIG = {
  FREE: {
    displayName: 'Free',
    limits: {
      maxProjects: 2,
      maxClients: 2,
      maxWorkspaceMembers: 1,
      githubIntegration: false,
      customBranding: false,
    },
    pricing: null,
  },

  PRO: {
    displayName: 'Pro',
    limits: {
      maxProjects: 15,
      maxClients: UNLIMITED,
      maxWorkspaceMembers: 1, 
      githubIntegration: true,
      customBranding: false,
    },
    pricing: true,
  },

  TEAM: {
    displayName: 'Team',
    limits: {
      maxProjects: UNLIMITED,
      maxClients: UNLIMITED,
      maxWorkspaceMembers: 5,
      githubIntegration: true,
      customBranding: true,
    },
    pricing: true,
  },

  ENTERPRISE: {
    displayName: 'Enterprise',
    limits: {
      maxProjects: UNLIMITED,
      maxClients: UNLIMITED,
      maxWorkspaceMembers: UNLIMITED,
      githubIntegration: true,
      customBranding: true,
    },
    // No self-serve pricing for Enterprise — they have to contact us to get a quote.
    pricing: null,
  },
}

// Helpers other code should actually call

export function getPlanConfig(plan) {
  const config = PLAN_CONFIG[plan]
  if (!config) {
    throw new Error(`Unknown plan: "${plan}". Must be one of ${Object.keys(PLAN_CONFIG).join(', ')}`)
  }
  return config
}

// Returns just one limit value, e.g. getLimit('PRO', 'maxProjects') -> 15
export function getLimit(plan, limitKey) {
  const config = getPlanConfig(plan)
  if (!(limitKey in config.limits)) {
    throw new Error(`Unknown limit key: "${limitKey}"`)
  }
  return config.limits[limitKey]
}

// Self-serve prices in minor units, per currency, plan and billing cycle.
// This is the only price list in the application. The Razorpay plan behind
// each entry is verified against it before every checkout.
export const PRICE_CATALOG = {
  USD: {
    PRO: { MONTHLY: 2900 },
    TEAM: { MONTHLY: 7900 },
  },
}

export const DEFAULT_CURRENCY = 'USD'
export const BASE_CURRENCY = 'INR'

// Razorpay documents a maximum of Rs 15,000 for registering a subscription
// mandate in INR.
export const MAX_RECURRING_AMOUNT = { INR: 1_500_000 }

const SELF_SERVE_PLANS = Object.keys(PLAN_CONFIG).filter((key) => PLAN_CONFIG[key].pricing)

// Razorpay plan ids are read at call time: RAZORPAY_PLAN_{PLAN}_{CYCLE}_{CURRENCY}.
function planIdFromEnv(plan, billingCycle, currency) {
  return process.env[`RAZORPAY_PLAN_${plan}_${billingCycle}_${currency}`] || null
}

// Non-INR billing needs International Payments (and recurring approval) on
// the Razorpay account, so it stays off until explicitly enabled.
export function isInternationalEnabled() {
  return process.env.RAZORPAY_INTERNATIONAL_ENABLED === 'true'
}

// Returns { currency, amount, razorpayPlanId } or null when the combination
// cannot be bought self-serve.
export function getPricing(plan, billingCycle, currency = DEFAULT_CURRENCY) {
  const amount = PRICE_CATALOG[currency]?.[plan]?.[billingCycle]
  if (!Number.isInteger(amount)) return null
  if (currency !== BASE_CURRENCY && !isInternationalEnabled()) return null
  const razorpayPlanId = planIdFromEnv(plan, billingCycle, currency)
  return razorpayPlanId ? { currency, amount, razorpayPlanId } : null
}

export function isSelfServeAvailable(plan, billingCycle, currency = DEFAULT_CURRENCY) {
  const pricing = getPricing(plan, billingCycle, currency)
  if (pricing === null) return false
  const cap = MAX_RECURRING_AMOUNT[currency]
  return cap === undefined || pricing.amount <= cap
}

// Billing cycles that exist in the catalog for a currency.
export function getCycles(currency = DEFAULT_CURRENCY) {
  const cycles = new Set()
  for (const plan of SELF_SERVE_PLANS) {
    for (const cycle of Object.keys(PRICE_CATALOG[currency]?.[plan] ?? {})) cycles.add(cycle)
  }
  return ['MONTHLY', 'YEARLY'].filter((cycle) => cycles.has(cycle))
}

// Currencies in which every self-serve plan is purchasable for every cycle.
export function getEnabledCurrencies() {
  return Object.keys(PRICE_CATALOG).filter((currency) => {
    const cycles = getCycles(currency)
    return (
      cycles.length > 0 &&
      SELF_SERVE_PLANS.every((plan) => cycles.every((cycle) => isSelfServeAvailable(plan, cycle, currency)))
    )
  })
}

export { UNLIMITED }
