'use client'

// components/billing/BillingPlans.jsx
//
// Holds the one piece of UI state this page needs client-side — which
// billing cycle is selected — and renders a PlanCard per plan. `plans`
// comes from the server (see page.jsx) as a plain, already-safe-to-serialize
// array; this component doesn't fetch or transform pricing itself.

import { useState } from 'react'
import PlanCard from './PlanCard'

export default function BillingPlans({ plans, currencies, currentPlan, isOwner, prefill }) {
  const [billingCycle, setBillingCycle] = useState('MONTHLY')
  const [currency, setCurrency] = useState(currencies[0])

  return (
    <section>
      <div className="mx-auto mb-8 flex w-fit items-center gap-1 rounded-full bg-slate-400 p-1">
        {['MONTHLY', 'YEARLY'].map((cycle) => (
          <button
            key={cycle}
            type="button"
            onClick={() => setBillingCycle(cycle)}
            className={`rounded-full px-4 py-1 text-sm blur-[0.7px] font-extrabold transition ${
              billingCycle === cycle ? 'bg-slate-300 text-slate-900 shadow-sm blur-none' : 'text-slate-700'
            }`}
          >
            {cycle === 'MONTHLY' ? 'Monthly' : 'Yearly'}
          </button>
        ))}
      </div>

      {currencies.length > 1 && (
        <div className="mx-auto mb-8 flex w-fit items-center gap-2 text-sm text-slate-500">
          <label htmlFor="billing-currency">Billing currency</label>
          <select
            id="billing-currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            className="rounded-md border border-slate-300 bg-transparent px-2 py-1 text-slate-700"
          >
            {currencies.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <PlanCard
            key={plan.key}
            plan={plan}
            currentPlan={currentPlan}
            billingCycle={billingCycle}
            currency={currency}
            isOwner={isOwner}
            prefill={prefill}
          />
        ))}
      </div>
    </section>
  )
}