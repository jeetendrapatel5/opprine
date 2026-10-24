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
//      - `fail_existing: 0` makes Razorpay RETURN the existing customer
//        (matched by email/contact) instead of throwing
//        "Customer already exists for the merchant".
//      - The customer id is saved to our DB immediately, so a failure in
//        a later step can never make us forget it.
//   5. Creates a Razorpay Subscription against that plan.
//   6. Saves a Subscription row locally with status PENDING — NOT
//      ACTIVE. We do not trust anything from this API response to mean
//      "they've paid." Only the webhook is allowed to mark a
//      subscription ACTIVE, because only the webhook is signed proof
//      that Razorpay actually processed a real payment.
//   7. Returns just enough info (subscription id + public key) for the
//      frontend to open Razorpay's Checkout widget.

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

// Razorpay SDK errors look like:
//   { statusCode: 400, error: { code, description, ... } }
// They are NOT Error instances, so a generic handler turns them into an
// opaque 500. This pulls out the real message for 4xx errors that are
// safe to show the user. 401/403 are excluded on purpose: those mean OUR
// Razorpay API keys are wrong, which is a server problem — not something
// to report to the frontend as "you are not authenticated".
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

// Looks through the Razorpay customer list for one with this email.
// Razorpay has no "search by email" endpoint, so we page through the list
// (100 at a time, capped at 1000 customers) and match the email ourselves.
async function findRazorpayCustomerByEmail(email) {
  const target = email.trim().toLowerCase()
  const PAGE_SIZE = 100
  for (let skip = 0; skip < 1000; skip += PAGE_SIZE) {
    const result = await razorpay.customers.all({ count: PAGE_SIZE, skip })
    const items = result?.items ?? []
    const match = items.find((c) => c.email?.trim().toLowerCase() === target)
    if (match) return match
    if (items.length < PAGE_SIZE) break
  }
  return null
}

// Creates the customer, or returns the existing one.
//   1. `fail_existing: '0'` (STRING) asks Razorpay to return the existing
//      customer instead of erroring.
//   2. If Razorpay still says "already exists", we look the customer up by
//      email ourselves. Only if that also finds nothing do we rethrow.
async function getOrCreateRazorpayCustomer({ name, email, workspaceId }) {
  try {
    return await razorpay.customers.create({
      name,
      email,
      fail_existing: '0',
      notes: { workspaceId },
    })
  } catch (error) {
    const alreadyExists =
      error?.statusCode === 400 &&
      /already exists/i.test(error?.error?.description ?? '')
    if (!alreadyExists) throw error

    const existing = await findRazorpayCustomerByEmail(email)
    if (existing) return existing
    throw error
  }
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

      // Returns the existing Razorpay customer if one already exists for
      // this email, instead of throwing "Customer already exists".
      const customer = await getOrCreateRazorpayCustomer({
        name: user.name,
        email: user.email,
        workspaceId: workspace.id,
      })
      razorpayCustomerId = customer.id

      // Persist the customer id RIGHT AWAY. If step 5 (creating the
      // subscription) fails, we still remember the customer, so the next
      // attempt reuses it instead of creating/looking it up again.
      // plan / billingCycle / status all have schema defaults
      // (FREE / NONE / ACTIVE), so creating a bare row is safe. If a
      // row already exists we ONLY touch razorpayCustomerId and leave
      // the current plan and status alone.
      await prisma.subscription.upsert({
        where: { workspaceId: workspace.id },
        create: { workspaceId: workspace.id, razorpayCustomerId },
        update: { razorpayCustomerId },
      })
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
    // Razorpay 4xx errors (bad plan id, invalid total_count, etc.) carry a
    // useful description — surface it instead of a generic 500. Always log
    // the full error server-side too, so the terminal shows what happened.
    const razorpayMessage = getRazorpayClientError(error)
    if (razorpayMessage) {
      console.error('Razorpay checkout error:', JSON.stringify(error?.error ?? error))
      return Response.json({ error: razorpayMessage }, { status: 400 })
    }

    return handleApiError(error)
  }
}