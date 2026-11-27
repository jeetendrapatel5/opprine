'use client'

// components/billing/ManageSubscription.jsx
//
// Shows the workspace's current Subscription row (status, renewal date,
// billing cycle) and lets the owner cancel it. Doesn't create any new
// billing logic — both cancel paths just call your existing
// app/api/billing/cancel/route.js, which already handles the
// cancel-at-period-end vs immediate distinction and the PENDING edge
// case server-side. This component is purely: display state, confirm,
// call the route, refresh.
//
// Only rendered by the page at all when a Subscription row with a real
// razorpaySubscriptionId exists — i.e. never for a workspace that's
// simply on FREE with no billing history.
//
// WHAT CHANGED IN THIS VERSION: only presentation.
//   - The one-line sentence ("Pro · Monthly billing · renews ...") became a
//     small set of labelled facts (Plan / Billing / Renews or Access ends).
//   - Status is a coloured dot + plain text instead of coloured text.
//   - The section has id="manage-subscription" so the plan cards can link
//     here ("cancel your current subscription").
//   - cancel(), the confirm dialogs, the fetch call and the canCancel rule
//     are exactly as before.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { titleCasePlan } from '@/lib/billing/format'
import { buttonStyles, StatusDot } from './ui'

// `tone` picks the dot colour (see DOT_TONES in ui.jsx).
const STATUS_COPY = {
  ACTIVE: { label: 'Active', tone: 'success' },
  PAST_DUE: { label: 'Payment failed', tone: 'warning' },
  PENDING: { label: 'Awaiting first payment', tone: 'neutral' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
  EXPIRED: { label: 'Expired', tone: 'danger' },
}

function formatDate(value) {
  if (!value) return null
  return new Date(value).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// One label + value pair in the summary grid.
function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-fp-text-secondary">{label}</dt>
      <dd className="mt-1 text-sm font-medium tabular-nums text-fp-text-primary">{value}</dd>
    </div>
  )
}

export default function ManageSubscription({ subscription, isOwner }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const status = STATUS_COPY[subscription.status] || STATUS_COPY.ACTIVE
  const periodEnd = formatDate(subscription.currentPeriodEnd)
  const alreadyEnding = subscription.cancelAtPeriodEnd

  async function cancel(immediately) {
    const confirmed = window.confirm(
      immediately
        ? 'Cancel immediately? You will lose access to paid features right away.'
        : `Cancel at the end of your current period${periodEnd ? ` (${periodEnd})` : ''}? You'll keep access until then.`
    )
    if (!confirmed) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediately }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Could not cancel subscription.')
      }
      router.refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const canCancel = isOwner && !['CANCELLED', 'EXPIRED'].includes(subscription.status) && !alreadyEnding

  // The third fact in the grid. Same rules as the old sentence:
  //   ending at period end  -> "Access ends <date>"
  //   active and renewing   -> "Renews <date>"
  //   otherwise             -> nothing
  let dateDetail = null
  if (periodEnd) {
    if (alreadyEnding) {
      dateDetail = { label: 'Access ends', value: periodEnd }
    } else if (subscription.status === 'ACTIVE') {
      dateDetail = { label: 'Renews', value: periodEnd }
    }
  }

  const showFooter = canCancel || alreadyEnding || !isOwner

  return (
    <section
      id="manage-subscription"
      aria-labelledby="manage-subscription-title"
      className="mt-12 scroll-mt-8 rounded-xl border border-fp-text-primary/10 bg-fp-surface p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="manage-subscription-title" className="text-base font-medium text-fp-text-primary">
          Your subscription
        </h2>
        <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-fp-text-secondary">
          <StatusDot tone={status.tone} />
          {status.label}
        </span>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        <Detail label="Plan" value={titleCasePlan(subscription.plan)} />
        <Detail label="Billing" value={subscription.billingCycle === 'YEARLY' ? 'Yearly' : 'Monthly'} />
        {dateDetail && <Detail label={dateDetail.label} value={dateDetail.value} />}
      </dl>

      {subscription.status === 'PAST_DUE' && (
        <p className="mt-6 flex gap-2 text-sm leading-5 text-fp-text-secondary">
          <StatusDot tone="warning" className="mt-1.5" />
          <span>
            Your last payment failed. You&apos;re currently limited to Free plan usage until this is resolved.
          </span>
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 flex gap-2 text-sm leading-5 text-fp-text-secondary">
          <StatusDot tone="danger" className="mt-1.5" />
          <span>{error}</span>
        </p>
      )}

      {showFooter && (
        <div className="mt-6 space-y-3 border-t border-fp-text-primary/10 pt-4">
          {canCancel && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <button
                type="button"
                onClick={() => cancel(false)}
                disabled={loading}
                className={buttonStyles.secondary}
              >
                Cancel at period end
              </button>
              <button
                type="button"
                onClick={() => cancel(true)}
                disabled={loading}
                className="inline-flex h-10 items-center rounded-lg text-sm font-medium text-fp-danger underline-offset-4 transition-colors duration-150 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fp-accent disabled:pointer-events-none disabled:opacity-50"
              >
                Cancel immediately instead
              </button>
            </div>
          )}

          {alreadyEnding && (
            <p className="text-sm text-fp-text-secondary">
              This subscription is already set to end{periodEnd ? ` on ${periodEnd}` : ''}
            </p>
          )}

          {!isOwner && <p className="text-sm text-fp-text-secondary">Only the workspace owner can manage billing</p>}
        </div>
      )}
    </section>
  )
}