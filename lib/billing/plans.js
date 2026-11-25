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
    pricing: {
      monthly: {
        amount: 99900,
        razorpayPlanId: process.env.RAZORPAY_PLAN_PRO_MONTHLY,
      },
      yearly: {
        amount: 999000, // e.g. ~2 months free vs monthly x12
        razorpayPlanId: process.env.RAZORPAY_PLAN_PRO_YEARLY,
      },
    },
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
    pricing: {
      monthly: {
        amount: 299900,
        razorpayPlanId: process.env.RAZORPAY_PLAN_TEAM_MONTHLY,
      },
      yearly: {
        amount: 2999000,
        razorpayPlanId: process.env.RAZORPAY_PLAN_TEAM_YEARLY,
      },
    },
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

// Razorpay documents a maximum of Rs 15,000 for registering a subscription
// mandate, so an INR plan whose charge exceeds it cannot be bought self-serve.
export const MAX_RECURRING_AMOUNT_PAISE = 1_500_000

export const BASE_CURRENCY = 'INR'
export const INTERNATIONAL_CURRENCIES = ['USD', 'EUR']

// International plans are created in the Razorpay dashboard in USD or EUR.
// Their amount is read from the Razorpay plan itself, so there is no second
// price list here to drift out of sync.
const INTERNATIONAL_PLAN_IDS = {
  PRO: {
    MONTHLY: {
      USD: process.env.RAZORPAY_PLAN_PRO_MONTHLY_USD,
      EUR: process.env.RAZORPAY_PLAN_PRO_MONTHLY_EUR,
    },
    YEARLY: {
      USD: process.env.RAZORPAY_PLAN_PRO_YEARLY_USD,
      EUR: process.env.RAZORPAY_PLAN_PRO_YEARLY_EUR,
    },
  },
  TEAM: {
    MONTHLY: {
      USD: process.env.RAZORPAY_PLAN_TEAM_MONTHLY_USD,
      EUR: process.env.RAZORPAY_PLAN_TEAM_MONTHLY_EUR,
    },
    YEARLY: {
      USD: process.env.RAZORPAY_PLAN_TEAM_YEARLY_USD,
      EUR: process.env.RAZORPAY_PLAN_TEAM_YEARLY_EUR,
    },
  },
}

// International billing is off unless explicitly enabled, because it needs
// International Payments and recurring approval on the Razorpay account.
export function isInternationalEnabled() {
  return process.env.RAZORPAY_INTERNATIONAL_ENABLED === 'true'
}

// Given a plan + billing cycle (+ currency, default INR), returns
// { currency, amount, razorpayPlanId } or null when that combination cannot
// be bought self-serve. `amount` is null for international plans: it lives
// on the Razorpay plan.
export function getPricing(plan, billingCycle, currency = BASE_CURRENCY) {
  const config = getPlanConfig(plan)
  if (!config.pricing) return null

  if (currency === BASE_CURRENCY) {
    const entry = config.pricing[billingCycle.toLowerCase()]
    return entry ? { currency, ...entry } : null
  }

  if (!isInternationalEnabled() || !INTERNATIONAL_CURRENCIES.includes(currency)) return null
  const razorpayPlanId = INTERNATIONAL_PLAN_IDS[plan]?.[billingCycle]?.[currency]
  return razorpayPlanId ? { currency, amount: null, razorpayPlanId } : null
}

export function isSelfServeAvailable(plan, billingCycle, currency = BASE_CURRENCY) {
  const pricing = getPricing(plan, billingCycle, currency)
  if (pricing === null) return false
  return currency !== BASE_CURRENCY || pricing.amount <= MAX_RECURRING_AMOUNT_PAISE
}

// Currencies in which every self-serve plan and cycle is configured.
export function getEnabledCurrencies() {
  const selfServe = Object.keys(PLAN_CONFIG).filter((key) => PLAN_CONFIG[key].pricing)
  return [BASE_CURRENCY, ...INTERNATIONAL_CURRENCIES].filter((currency) =>
    currency === BASE_CURRENCY
      ? true
      : selfServe.every((plan) => ['MONTHLY', 'YEARLY'].every((cycle) => getPricing(plan, cycle, currency) !== null))
  )
}

export { UNLIMITED }