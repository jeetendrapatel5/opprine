// app/dashboard/settings/billing/page.jsx
//
// FLAGGED ASSUMPTION: I don't have your actual dashboard route
// structure (no layout files were shared with me), so this path is a
// guess. Every import here uses the `@/` alias, so moving this file to
// wherever your real routing lives won't require touching anything
// inside it.
//
// Data flow:
//   1. Confirm who's logged in — same getServerSession pattern as
//      app/api/workspace/route.js.
//   2. requireWorkspaceMembership — same function every other route
//      uses, never a one-off query.
//   3. Read entitlements AND the raw Subscription row in parallel.
//      These answer two different questions:
//        - getEntitlements(workspaceId) -> "what can they do right now"
//          (falls back to FREE if the subscription isn't ACTIVE — see
//          entitlements.js). This is what decides which card shows
//          "Current plan."
//        - prisma.subscription.findUnique -> billing METADATA
//          (renewal date, cancelAtPeriodEnd, raw status). entitlements.js
//          deliberately doesn't return this — its job is entitlement
//          decisions, not bill display. Reading the row directly here is
//          a plain display query, not a new enforcement path, so it
//          doesn't belong in entitlements.js.
//   4. Build a client-safe plan list from PLAN_CONFIG. plans.js is
//      server-only (it reads RAZORPAY_PLAN_* env vars at module scope),
//      so it's imported here — never inside a 'use client' file — and
//      only the display-safe fields (name, limits, price amount) get
//      extracted into a plain object before being handed to
//      BillingPlans. The real razorpayPlanId values never leave the
//      server.
//
// One more deliberate choice: `Infinity` (plans.js's UNLIMITED) is
// swapped for `null` before this data crosses into a Client Component.
// React Server Components' wire format can technically carry Infinity,
// but I didn't want this page's correctness depending on that edge
// case — formatLimit() in lib/billing/format.js treats null the same
// as Infinity ("Unlimited").

import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { requireWorkspaceMembership } from '@/lib/workspace'
import { getEntitlements } from '@/lib/billing/entitlements'
import { PLAN_CONFIG } from '@/lib/billing/plans'
import BillingPlans from '@/components/billing/BillingPlans'
import ManageSubscription from '@/components/billing/ManageSubscription'

const PLAN_KEYS = ['FREE', 'PRO', 'TEAM', 'ENTERPRISE']

function toClientLimits(limits) {
  return Object.fromEntries(
    Object.entries(limits).map(([key, value]) => [key, value === Infinity ? null : value])
  )
}

export default async function BillingSettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/signin')
  }

  const membership = await requireWorkspaceMembership(session.user.id)

  const [entitlements, subscription, user] = await Promise.all([
    getEntitlements(membership.workspaceId),
    prisma.subscription.findUnique({ where: { workspaceId: membership.workspaceId } }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    }),
  ])

  const plans = PLAN_KEYS.map((key) => {
    const config = PLAN_CONFIG[key]
    return {
      key,
      displayName: config.displayName,
      limits: toClientLimits(config.limits),
      pricing: config.pricing
        ? {
            monthly: config.pricing.monthly.amount,
            yearly: config.pricing.yearly.amount,
          }
        : null,
    }
  })

  const isOwner = membership.role === 'OWNER'

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10 text-center">
        <p className="text-sm font-medium text-slate-500">Billing</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--color-fp-text-primary)]">Plans &amp; billing</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          You&apos;re on the {entitlements.displayName} plan
          {Number.isFinite(entitlements.usage.projects.limit) && (
            <>
              {' '}
              - {entitlements.usage.projects.used} of {entitlements.usage.projects.limit} projects used
            </>
          )}
          .
        </p>
      </header>

      <BillingPlans
        plans={plans}
        currentPlan={entitlements.plan}
        isOwner={isOwner}
        prefill={{ name: user?.name, email: user?.email }}
      />

      {subscription?.razorpaySubscriptionId && (
        <ManageSubscription
          subscription={{
            plan: subscription.plan,
            billingCycle: subscription.billingCycle,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          }}
          isOwner={isOwner}
        />
      )}
    </div>
  )
}