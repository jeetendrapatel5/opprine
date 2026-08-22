// lib/billing/format.js
//
// Small formatting helpers for any UI that displays plan pricing or
// limits. Deliberately kept separate from plans.js / entitlements.js —
// those two files are the source of truth for VALUES (limits, prices).
// This file only decides how those values get printed as text, and it
// has zero side effects, so it's safe to import from either a Server
// Component or a 'use client' component.

// plans.js stores amounts in paise (the smallest INR unit, same idea as
// cents for USD) because that's what Razorpay's API expects. 99900
// paise = ₹999. Anywhere you display a price, convert here — don't
// divide by 100 inline at the call site, so this is the one place that
// logic lives.
export function formatINR(amountInPaise) {
  if (amountInPaise === null || amountInPaise === undefined) return '—'
  const rupees = amountInPaise / 100
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees)
}

// plans.js uses JS's `Infinity` to mean "no limit" (see UNLIMITED in
// that file) — great for comparisons like `used < limit`, but you can't
// print Infinity in a UI. We also accept `null` here: when the billing
// page passes plan limits from a Server Component down to a Client
// Component, it swaps Infinity -> null first (see the comment in
// app/dashboard/settings/billing/page.jsx for why) rather than relying
// on Infinity surviving that serialization boundary.
export function formatLimit(value) {
  if (value === Infinity || value === null) return 'Unlimited'
  return String(value)
}

// FREE -> "Free", PRO -> "Pro", etc. plans.js already has `displayName`
// per plan for this — this is only a fallback for places a raw enum
// value shows up without going through PLAN_CONFIG (e.g. inside
// UpgradeButton, which intentionally never imports plans.js — see that
// file's top comment).
export function titleCasePlan(plan) {
  if (!plan) return ''
  return plan.charAt(0) + plan.slice(1).toLowerCase()
}