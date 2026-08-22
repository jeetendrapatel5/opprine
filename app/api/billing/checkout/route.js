// app/api/billing/checkout/route.js
//
// POST { plan: 'PRO' | 'TEAM', billingCycle: 'MONTHLY' | 'YEARLY' }
//
// What this route does, step by step:
//   1. Confirms who's logged in (NextAuth session).
//   2. Finds their workspace, and confirms they're the OWNER — only the
//      owner should be able to change billing for a workspace.
//   3. Looks up the Razorpay Plan ID for the requested plan+cycle from
//      our centralized config (lib/billing/plans.js).
//   4. Creates (or reuses) a Razorpay Customer for this workspace.
//   5. Creates a Razorpay Subscription against that plan.
//   6. Saves a Subscription row locally with status PENDING — NOT
//      ACTIVE. We do not trust anything from this API response to mean
//      "they've paid." Only the webhook (next file) is allowed to mark
//      a subscription ACTIVE, because only the webhook is signed proof
//      that Razorpay actually processed a real payment.
//   7. Returns just enough info (subscription id + public key) for the
//      frontend to open Razorpay's Checkout widget.
//
// ASSUMPTION FLAGGED: this imports `authOptions` from '@/lib/auth' and
// uses NextAuth's getServerSession. Tell me the real path/export name
// if that's wrong and I'll fix this one import line.

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { razorpay } from '@/lib/billing/razorpay'
import { getPricing } from '@/lib/billing/plans'
import { requireWorkspaceMembership, requireRole } from '@/lib/workspace'
import { handleApiError } from '@/lib/http-errors'

// Monthly subscriptions: bill for 10 years' worth of cycles (120), which
// in practice means "keep billing until explicitly cancelled" — Razorpay
// requires SOME finite total_count, there's no true "forever" option.
// Yearly: 10 cycles = 10 years, same idea.
const TOTAL_COUNT_BY_CYCLE = {
  monthly: 120,
  yearly: 10,
}

export async function POST(request) {
  try {
    // 1. Auth check.
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { plan, billingCycle } = body

    // Basic input validation — reject anything that isn't one of the two
    // plans that actually have self-serve checkout. FREE never needs
    // checkout; ENTERPRISE is manual (see plans.js).
    if (!['PRO', 'TEAM'].includes(plan)) {
      return Response.json(
        { error: 'This plan is not available for self-serve checkout.' },
        { status: 400 }
      )
    }
    if (!['MONTHLY', 'YEARLY'].includes(billingCycle)) {
      return Response.json({ error: 'Invalid billing cycle.' }, { status: 400 })
    }

    // 2. Find the workspace this user belongs to, and confirm they're
    // the OWNER — only the owner can change billing for a workspace.
    // requireRole throws ForbiddenError (-> 403) automatically if not.
    const membership = await requireWorkspaceMembership(session.user.id)
    requireRole(membership.role, ['OWNER'])
    const workspace = membership.workspace

    // 3. Look up pricing/plan id from the centralized config.
    const pricing = getPricing(plan, billingCycle)
    if (!pricing || !pricing.razorpayPlanId) {
      // This fires if you forgot to set the RAZORPAY_PLAN_* env var for
      // this plan+cycle combo — fail loudly instead of sending Razorpay
      // an undefined plan_id.
      return Response.json(
        { error: `Pricing is not configured for ${plan} / ${billingCycle}.` },
        { status: 500 }
      )
    }

    // 4. Get-or-create a Razorpay Customer for this workspace.
    // We look at any existing Subscription row for a customer id we
    // already created, so repeat upgrades/downgrades don't create a new
    // Razorpay customer every time.
    const existingSubscription = await prisma.subscription.findUnique({
      where: { workspaceId: workspace.id },
    })

    let razorpayCustomerId = existingSubscription?.razorpayCustomerId

    if (!razorpayCustomerId) {
      const user = await prisma.user.findUnique({ where: { id: session.user.id } })
      const customer = await razorpay.customers.create({
        name: user.name,
        email: user.email,
        notes: { workspaceId: workspace.id },
      })
      razorpayCustomerId = customer.id
    }

    // 5. Create the actual Razorpay Subscription.
    const razorpaySubscription = await razorpay.subscriptions.create({
      plan_id: pricing.razorpayPlanId,
      customer_notify: 1, // Razorpay emails the customer directly too
      total_count: TOTAL_COUNT_BY_CYCLE[billingCycle.toLowerCase()],
      quantity: 1,
      notes: { workspaceId: workspace.id }, // helpful for debugging in Razorpay's dashboard
    })

    // 6. Upsert our local Subscription row.
    // `upsert` because a workspace might already have a row (e.g. they're
    // on FREE, or switching plans) — we update it in place rather than
    // erroring on the unique workspaceId constraint.
    await prisma.subscription.upsert({
      where: { workspaceId: workspace.id },
      create: {
        workspaceId: workspace.id,
        plan,
        billingCycle,
        status: 'PENDING',
        razorpayCustomerId,
        razorpaySubscriptionId: razorpaySubscription.id,
        razorpayPlanId: pricing.razorpayPlanId,
      },
      update: {
        plan,
        billingCycle,
        status: 'PENDING',
        razorpayCustomerId,
        razorpaySubscriptionId: razorpaySubscription.id,
        razorpayPlanId: pricing.razorpayPlanId,
      },
    })

    // 7. Return only what the frontend's checkout widget needs.
    // NEVER return RAZORPAY_KEY_SECRET — only the public key_id.
    return Response.json({
      subscriptionId: razorpaySubscription.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    })
  } catch (error) {
    return handleApiError(error)
  }
}