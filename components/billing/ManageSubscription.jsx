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

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { titleCasePlan } from '@/lib/billing/format'

const STATUS_COPY = {
  ACTIVE: { label: 'Active', tone: 'text-emerald-700' },
  PAST_DUE: { label: 'Payment failed', tone: 'text-amber-700' },
  PENDING: { label: 'Awaiting first payment', tone: 'text-slate-600' },
  CANCELLED: { label: 'Cancelled', tone: 'text-slate-600' },
  EXPIRED: { label: 'Expired', tone: 'text-red-700' },
}

function formatDate(value) {
  if (!value) return null
  return new Date(value).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
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

  return (
    <section className="mt-12 rounded-2xl border border-slate-500 p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-[var(--color-fp-text-secondary)]">Your subscription</h2>
        <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${status.tone}`}>
          {status.label}
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-600">
        {titleCasePlan(subscription.plan)} · {subscription.billingCycle === 'YEARLY' ? 'Yearly' : 'Monthly'} billing
        {subscription.status === 'ACTIVE' && !alreadyEnding && periodEnd && <> · renews {periodEnd}</>}
        {alreadyEnding && periodEnd && <> · access ends {periodEnd}</>}
      </p>

      {subscription.status === 'PAST_DUE' && (
        <p className="mt-2 text-sm text-amber-700">
          Your last payment failed. You&apos;re currently limited to Free plan usage until this is resolved.
        </p>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {canCancel && (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => cancel(false)}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel at period end
          </button>
          <button
            type="button"
            onClick={() => cancel(true)}
            disabled={loading}
            className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
          >
            Cancel immediately instead
          </button>
        </div>
      )}

      {alreadyEnding && (
        <p className="mt-4 text-sm text-slate-500">
          This subscription is already set to end{periodEnd ? ` on ${periodEnd}` : ''}.
        </p>
      )}

      {!isOwner && (
        <p className="mt-4 text-xs text-slate-400">Only the workspace owner can manage billing.</p>
      )}
    </section>
  )
}