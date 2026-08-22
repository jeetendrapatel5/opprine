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

// Given a plan + billing cycle, returns { amount, razorpayPlanId } or
// null if that plan has no self-serve pricing (FREE, ENTERPRISE).
export function getPricing(plan, billingCycle) {
  const config = getPlanConfig(plan)
  if (!config.pricing) return null
  return config.pricing[billingCycle.toLowerCase()] ?? null
}

export { UNLIMITED }