'use client'

// components/billing/UpgradeButton.jsx
//
// One button = one plan + billing cycle. Drop it into a plan card and it
// handles the whole upgrade flow. Deliberately does NOT import
// lib/billing/plans.js — that file reads process.env.RAZORPAY_PLAN_*
// values at module scope, and it should never end up inside a client
// bundle. Everything this component needs (plan, billingCycle, prefill)
// is passed in as plain props from the server.
//
// Data flow, step by step:
//   1. Click -> load Razorpay's Checkout.js script (once).
//   2. POST /api/billing/checkout with { plan, billingCycle } -> your
//      existing route creates a Razorpay subscription and saves a local
//      Subscription row as PENDING. Returns { subscriptionId, razorpayKeyId }.
//   3. Open Razorpay's Checkout popup against that subscription.
//   4. Razorpay's own `handler` callback fires once the popup thinks the
//      payment succeeded. We do NOT treat the workspace as upgraded at
//      this point — same rule your checkout route's comments already
//      state: only the webhook (signed, server-verified) is allowed to
//      mark a Subscription ACTIVE. A client-side callback can be
//      spoofed or can fire even on a flow Razorpay later reverses.
//   5. So instead, we poll GET /api/workspace every 2s (up to ~30s)
//      until entitlements.plan actually matches what was just paid for.
//      That endpoint reads real DB state — it only changes once your
//      webhook has processed the event. Once it matches, we call
//      router.refresh() so the rest of the page (which reads plan
//      server-side) picks up the change too.
//
// FLAGGED ASSUMPTIONS (things I couldn't know without your actual file):
//   - `name: 'Opprine'` below — Razorpay's checkout popup shows this as
//     the merchant name. Hardcoded; change it if your account is set up
//     under a different display name.
//   - `theme.color` — set to match the slate-900 buttons used elsewhere
//     in these new components. Swap for your real brand color.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { titleCasePlan } from '@/lib/billing/format'

const RAZORPAY_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'
const POLL_INTERVAL_MS = 2000
const MAX_POLL_ATTEMPTS = 15 // ~30 seconds total

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Razorpay checkout can only load in the browser.'))
      return
    }
    if (window.Razorpay) {
      resolve()
      return
    }
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay checkout script.')))
      return
    }
    const script = document.createElement('script')
    script.src = RAZORPAY_SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout script.'))
    document.body.appendChild(script)
  })
}

// Polls until entitlements.plan === expectedPlan, or gives up.
// Returns true/false rather than throwing — a timeout here isn't an
// error, it just means the webhook hasn't landed yet (Razorpay's docs
// don't guarantee webhook delivery is instant).
async function pollForPlanActivation(expectedPlan) {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    try {
      const res = await fetch('/api/workspace', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (data?.entitlements?.plan === expectedPlan) {
          return true
        }
      }
    } catch {
      // Network hiccup mid-poll — just try again on the next interval.
    }
  }
  return false
}

export default function UpgradeButton({
  plan, // 'PRO' | 'TEAM'
  billingCycle, // 'MONTHLY' | 'YEARLY'
  prefill, // { name, email } — optional
  onActivated, // optional callback, fires once the upgrade is confirmed
  className = '',
}) {
  const router = useRouter()
  const [status, setStatus] = useState('idle') // idle | opening | confirming | timed_out | error
  const [errorMessage, setErrorMessage] = useState('')
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Shared by both the Razorpay success handler AND the "Check again"
  // button after a timeout — neither of those should ever re-open
  // checkout, they should just re-check whether the webhook has landed.
  const waitForActivation = useCallback(async () => {
    setStatus('confirming')
    const activated = await pollForPlanActivation(plan)
    if (!isMounted.current) return
    if (activated) {
      setStatus('idle')
      onActivated?.()
      router.refresh()
    } else {
      setStatus('timed_out')
    }
  }, [plan, onActivated, router])

  const handleClick = useCallback(async () => {
    setStatus('opening')
    setErrorMessage('')

    try {
      await loadRazorpayScript()

      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billingCycle }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || 'Could not start checkout. Please try again.')
      }

      const { subscriptionId, razorpayKeyId } = data

      const rzp = new window.Razorpay({
        key: razorpayKeyId,
        subscription_id: subscriptionId,
        name: 'Opprine',
        description: `${titleCasePlan(plan)} plan — ${billingCycle === 'YEARLY' ? 'yearly' : 'monthly'}`,
        prefill: {
          name: prefill?.name || '',
          email: prefill?.email || '',
        },
        theme: { color: '#0f172a' },
        handler: () => {
          // Razorpay believes the payment succeeded. We still wait for
          // our own webhook before believing the workspace is upgraded.
          waitForActivation()
        },
        modal: {
          ondismiss: () => {
            // User closed the popup without paying — just go back to idle.
            if (isMounted.current) setStatus('idle')
          },
        },
      })

      rzp.on('payment.failed', (response) => {
        if (!isMounted.current) return
        setStatus('error')
        setErrorMessage(
          response?.error?.description || 'Payment failed. No charge was made — you can try again.'
        )
      })

      rzp.open()
    } catch (err) {
      if (!isMounted.current) return
      setStatus('error')
      setErrorMessage(err.message || 'Something went wrong starting checkout.')
    }
  }, [plan, billingCycle, prefill, waitForActivation])

  if (status === 'confirming') {
    return (
      <div
        className={`rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-center text-sm text-slate-600 ${className}`}
      >
        Payment received — confirming your upgrade…
      </div>
    )
  }

  if (status === 'timed_out') {
    return (
      <div className={`space-y-2 ${className}`}>
        <p className="text-sm text-amber-700">
          We saw your payment, but haven&apos;t confirmed the upgrade yet. This is usually just a short delay.
        </p>
        <button
          type="button"
          onClick={waitForActivation}
          className="w-full rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Check again
        </button>
      </div>
    )
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={status === 'opening'}
        className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {status === 'opening' ? 'Opening secure checkout…' : `Upgrade to ${titleCasePlan(plan)}`}
      </button>
      {status === 'error' && <p className="mt-2 text-xs text-red-600">{errorMessage}</p>}
    </div>
  )
}