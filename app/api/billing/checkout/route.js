// app/api/billing/checkout/route.js
//
// POST { plan: 'PRO' | 'TEAM', billingCycle: 'MONTHLY' | 'YEARLY' }
//
// Creates a Razorpay subscription for the owner's workspace and returns
// what the Checkout widget needs. The workspace's Subscription row is not
// touched: the attempt is recorded in CheckoutAttempt and only becomes the
// workspace's subscription once the webhook sync sees a successful charge
// (lib/billing/subscription-sync.js). A workspace with a live subscription
// is rejected with 409 instead of being overwritten.

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { razorpay } from '@/lib/billing/razorpay'
import { getPricing } from '@/lib/billing/plans'
import { assertRazorpayPlanMatches } from '@/lib/billing/plan-verification'
import { createCheckout } from '@/lib/billing/checkout'
import { requireWorkspaceMembership, requireRole } from '@/lib/workspace'
import { handleApiError } from '@/lib/http-errors'

// Razorpay SDK errors look like { statusCode, error: { code, description } }
// and are not Error instances. 4xx descriptions are safe to show; 401/403
// mean our own API keys are wrong and are reported as server errors.
function getRazorpayClientError(error) {
  const statusCode = error?.statusCode
  const description = error?.error?.description
  if (
    typeof statusCode === 'number' &&
    statusCode >= 400 &&
    statusCode < 500 &&
    statusCode !== 401 &&
    statusCode !== 403 &&
    description
  ) {
    return description
  }
  return null
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { plan, billingCycle } = await request.json()

    if (!['PRO', 'TEAM'].includes(plan)) {
      return Response.json(
        { error: 'This plan is not available for self-serve checkout.' },
        { status: 400 }
      )
    }
    if (!['MONTHLY', 'YEARLY'].includes(billingCycle)) {
      return Response.json({ error: 'Invalid billing cycle.' }, { status: 400 })
    }

    const membership = await requireWorkspaceMembership(session.user.id)
    requireRole(membership.role, ['OWNER'])

    const pricing = getPricing(plan, billingCycle)
    if (!pricing || !pricing.razorpayPlanId) {
      console.error('Razorpay plan id is not configured:', { plan, billingCycle })
      return Response.json(
        { error: `Pricing is not configured for ${plan} / ${billingCycle}.` },
        { status: 500 }
      )
    }

    try {
      await assertRazorpayPlanMatches(razorpay, pricing, billingCycle)
    } catch (error) {
      console.error('Razorpay plan verification failed:', error?.message ?? error)
      return Response.json(
        { error: `Pricing is not available for ${plan} / ${billingCycle} right now.` },
        { status: 500 }
      )
    }

    const { subscriptionId } = await createCheckout({
      prisma,
      razorpay,
      workspaceId: membership.workspaceId,
      plan,
      billingCycle,
      pricing,
    })

    return Response.json({
      subscriptionId,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    })
  } catch (error) {
    const razorpayMessage = getRazorpayClientError(error)
    if (razorpayMessage) {
      console.error('Razorpay checkout error:', JSON.stringify(error?.error ?? error))
      return Response.json({ error: razorpayMessage }, { status: 400 })
    }

    return handleApiError(error)
  }
}
