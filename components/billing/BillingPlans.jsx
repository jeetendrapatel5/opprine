'use client'

// components/billing/BillingPlans.jsx
//
// Holds the two pieces of UI state this page needs client-side — which
// billing cycle and which currency are selected — and lays out the plans.
// `plans` comes from the server (see page.jsx) as a plain,
// already-safe-to-serialize array; this component doesn't fetch or
// transform pricing itself.
//
// Layout:
//   1. A toolbar: billing period on the left, currency on the right.
//   2. Free / Pro / Team as three cards.
//   3. Enterprise as one wide band underneath (it has no price and no
//      checkout, so it doesn't need a column).
//
// Responsive behaviour uses CONTAINER queries (the @3xl: / @xl: prefixes),
// not screen-width queries. The page lives next to a sidebar, so the
// screen can be wide while the content area is narrow. A container query
// looks at the width of this section, which is what actually matters.

import { useMemo, useState } from 'react'
import PlanCard from './PlanCard'

const CYCLES = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
]

// Works out "how much cheaper is yearly" from the prices that are already
// on the page. Nothing is hard-coded: for each plan we compare the yearly
// price with 12 monthly payments, and keep the biggest saving.
//   - Percentages don't depend on whether amounts are in rupees or paise,
//     so this is safe whatever unit `amount` uses.
//   - Math.floor rounds DOWN, so we never promise more than is true.
//   - Returns null (and the label is hidden) when there is nothing to show.
function getYearlySavings(plans, currency) {
  let best = 0
  for (const plan of plans) {
    const monthly = plan.offers?.[currency]?.MONTHLY
    const yearly = plan.offers?.[currency]?.YEARLY
    if (!monthly || !yearly || !monthly.available || !yearly.available) continue

    const monthlyAmount = Number(monthly.amount)
    const yearlyAmount = Number(yearly.amount)
    if (!(monthlyAmount > 0) || !(yearlyAmount > 0)) continue

    const saving = Math.floor((1 - yearlyAmount / (monthlyAmount * 12)) * 100)
    if (saving > best) best = saving
  }
  return best >= 1 ? best : null
}

export default function BillingPlans({ plans, currencies, currentPlan, isOwner, prefill }) {
  const [billingCycle, setBillingCycle] = useState('MONTHLY')
  const [currency, setCurrency] = useState(currencies[0])

  const yearlySavings = useMemo(() => getYearlySavings(plans, currency), [plans, currency])

  // Enterprise is drawn separately as a wide band; everything else is a card.
  const cardPlans = plans.filter((plan) => plan.key !== 'ENTERPRISE')
  const enterprisePlan = plans.find((plan) => plan.key === 'ENTERPRISE')

  const sharedProps = { currentPlan, billingCycle, currency, isOwner, prefill }

  return (
    <section className="@container" aria-labelledby="plans-heading">
      <h2 id="plans-heading" className="sr-only">
        Plans
      </h2>

      {!isOwner && (
        <p className="mb-6 rounded-lg border border-fp-text-primary/10 bg-fp-surface px-4 py-3 text-sm text-fp-text-secondary">
          Only the workspace owner can change plans
        </p>
      )}

      <div className="mb-6 flex flex-col gap-4 @xl:flex-row @xl:items-center @xl:justify-between">
        {/* Billing period — a two-option segmented control.
            aria-pressed tells screen readers which option is on. */}
        <div
          role="group"
          aria-label="Billing period"
          className="inline-flex w-fit rounded-lg border border-fp-text-primary/10 bg-fp-surface p-0.5"
        >
          {CYCLES.map(({ value, label }) => {
            const active = billingCycle === value
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => setBillingCycle(value)}
                className={`inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fp-accent ${
                  active
                    ? 'bg-fp-raised text-fp-text-primary ring-1 ring-fp-text-primary/10'
                    : 'text-fp-text-secondary hover:text-fp-text-primary'
                }`}
              >
                {label}
                {value === 'YEARLY' && yearlySavings && (
                  <span className="text-xs font-normal tabular-nums text-fp-success">Save {yearlySavings}%</span>
                )}
              </button>
            )
          })}
        </div>

        {currencies.length > 1 && (
          <div className="flex items-center gap-3">
            <label htmlFor="billing-currency" className="text-sm text-fp-text-secondary">
              Billing currency
            </label>
            {/* Native <select>: free keyboard support and works on every
                phone. `color-scheme:dark` makes the open list dark too. */}
            <select
              id="billing-currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className="h-10 rounded-lg border border-fp-text-primary/10 bg-fp-base px-3 text-sm text-fp-text-primary transition-colors duration-150 [color-scheme:dark] hover:border-fp-text-primary/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fp-accent"
            >
              {currencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid gap-4 @3xl:grid-cols-3">
        {cardPlans.map((plan, index) => (
          <PlanCard key={plan.key} plan={plan} index={index} {...sharedProps} />
        ))}
      </div>

      {enterprisePlan && (
        <div className="mt-4">
          <PlanCard plan={enterprisePlan} index={cardPlans.length} wide {...sharedProps} />
        </div>
      )}
    </section>
  )
}