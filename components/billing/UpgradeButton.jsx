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
//   2. POST /api/billing/checkout with { plan, billingCycle, currency } ->
//      the route creates a Razorpay subscription and records a checkout
//      attempt; the workspace's Subscription row is not touched until the
//      payment is confirmed. Returns { subscriptionId, razorpayKeyId }.
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
// WHAT CHANGED IN THIS VERSION: only presentation.
//   - New optional `variant` prop: 'primary' (accent fill) or 'secondary'
//     (outline). PlanCard uses primary for the recommended plan only.
//   - Buttons and messages use the shared styles in ./ui.jsx.
//   - Loading states show a small spinner; messages use a status dot so the
//     text stays readable.
//   - Everything above step 1-5 (script loading, checkout call, polling,
//     handlers) is unchanged.
//
// FLAGGED ASSUMPTIONS (things I couldn't know without your actual file):
//   - `name: 'Opprine'` below — Razorpay's checkout popup shows this as
//     the merchant name. Hardcoded; change it if your account is set up
//     under a different display name.
//   - `theme.color` — Razorpay's popup can't read CSS variables, so this
//     has to be a literal hex. It is now the value of --color-fp-base
//     (#0D1117) instead of the old slate-900.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { titleCasePlan } from '@/lib/billing/format'
import { buttonStyles, Spinner, StatusDot } from './ui'

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
  currency = 'INR', // 'INR' | 'USD' | 'EUR'
  prefill, // { name, email } — optional
  onActivated, // optional callback, fires once the upgrade is confirmed
  variant = 'primary', // 'primary' | 'secondary' — look only, no logic
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
        body: JSON.stringify({ plan, billingCycle, currency }),
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
        theme: { color: '#0D1117' },
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
  }, [plan, billingCycle, currency, prefill, waitForActivation])

  // ── Presentation only from here down ──────────────────────────────────

  if (status === 'confirming') {
    return (
      <div
        role="status"
        className={`flex min-h-10 items-center justify-center gap-2 rounded-lg border border-fp-text-primary/10 bg-fp-text-primary/5 px-4 py-2 text-sm leading-5 text-fp-text-secondary ${className}`}
      >
        <Spinner />
        <span>Payment received — confirming your upgrade…</span>
      </div>
    )
  }

  if (status === 'timed_out') {
    return (
      <div className={`space-y-3 ${className}`}>
        <p role="status" className="flex gap-2 text-sm leading-5 text-fp-text-secondary">
          <StatusDot tone="warning" className="mt-1.5" />
          <span>
            We saw your payment, but haven&apos;t confirmed the upgrade yet. This is usually just a short delay.
          </span>
        </p>
        <button type="button" onClick={waitForActivation} className={`${buttonStyles.secondary} w-full`}>
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
        aria-busy={status === 'opening'}
        className={`${variant === 'secondary' ? buttonStyles.secondary : buttonStyles.primary} w-full`}
      >
        {status === 'opening' ? (
          <>
            <Spinner />
            Opening secure checkout…
          </>
        ) : (
          `Upgrade to ${titleCasePlan(plan)}`
        )}
      </button>
      {status === 'error' && (
        <p role="alert" className="mt-3 flex gap-2 text-xs leading-5 text-fp-text-secondary">
          <StatusDot tone="danger" className="mt-1.5" />
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  )
}