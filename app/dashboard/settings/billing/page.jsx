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
//
// WHAT CHANGED IN THIS VERSION: only the markup returned at the bottom.
// Steps 1-4 above (all the data loading) are untouched. The header is now
// left-aligned, with a small "projects used" meter on the right built from
// the same entitlements.usage.projects numbers the old sentence used.

import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { requireWorkspaceMembership } from '@/lib/workspace'
import { getEntitlements } from '@/lib/billing/entitlements'
import { PLAN_CONFIG } from '@/lib/billing/plans'
import { getDisplayOffers } from '@/lib/billing/display-prices'
import { razorpay } from '@/lib/billing/razorpay'
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

  const { currencies, offers } = await getDisplayOffers(razorpay)

  const plans = PLAN_KEYS.map((key) => {
    const config = PLAN_CONFIG[key]
    return {
      key,
      displayName: config.displayName,
      limits: toClientLimits(config.limits),
      offers: offers[key] ?? null,
    }
  })

  const isOwner = membership.role === 'OWNER'

  // Display-only numbers for the header meter. Same condition as before:
  // only show usage when the plan has a real (finite) project limit. The
  // extra `> 0` guard just avoids dividing by zero.
  const projectUsage = entitlements.usage.projects
  const showProjectMeter = Number.isFinite(projectUsage.limit) && projectUsage.limit > 0
  const projectRatio = showProjectMeter ? Math.min(projectUsage.used / projectUsage.limit, 1) : 0
  const atProjectLimit = showProjectMeter && projectUsage.used >= projectUsage.limit

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-fp-text-secondary">Billing</p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight text-fp-text-primary text-balance">
            Plans &amp; billing
          </h1>
          <p className="mt-2 text-sm text-fp-text-secondary">
            You&apos;re on the <span className="text-fp-text-primary">{entitlements.displayName}</span> plan
          </p>
        </div>

        {showProjectMeter && (
          <div className="w-full sm:w-64">
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="text-fp-text-secondary">Projects</span>
              <span className="tabular-nums text-fp-text-primary">
                {projectUsage.used} of {projectUsage.limit} used
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Projects used"
              aria-valuemin={0}
              aria-valuemax={projectUsage.limit}
              aria-valuenow={Math.min(projectUsage.used, projectUsage.limit)}
              className="mt-2 h-1 overflow-hidden rounded-full bg-fp-text-primary/10"
            >
              <div
                className={`h-full rounded-full ${atProjectLimit ? 'bg-fp-warning' : 'bg-fp-accent'}`}
                style={{ width: `${projectRatio * 100}%` }}
              />
            </div>
          </div>
        )}
      </header>

      <BillingPlans
        plans={plans}
        currencies={currencies}
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