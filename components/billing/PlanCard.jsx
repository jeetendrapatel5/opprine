'use client'

// components/billing/PlanCard.jsx
//
// Renders one plan's card: name, price, a feature/limit comparison list,
// and whichever call-to-action fits the viewer's situation relative to
// this plan. `plan` is a plain, pre-serialized object built server-side
// in app/dashboard/settings/billing/page.jsx from lib/billing/plans.js —
// this component never imports plans.js directly (see UpgradeButton.jsx
// for why that matters).

import UpgradeButton from './UpgradeButton'
import { formatINR, formatLimit } from '@/lib/billing/format'

// Display order only — NOT a source of truth for limits or pricing.
// Those live in exactly one place: lib/billing/plans.js. This array
// only decides left-to-right ordering and "is this plan above or below
// the current one," which is a display/UX concern, not an entitlement.
const PLAN_ORDER = ['FREE', 'PRO', 'TEAM', 'ENTERPRISE']

const FEATURE_ROWS = [
  { key: 'maxProjects', label: 'Projects' },
  { key: 'maxClients', label: 'Clients' },
  { key: 'maxWorkspaceMembers', label: 'Workspace members' },
  { key: 'githubIntegration', label: 'GitHub commit summaries' },
  { key: 'customBranding', label: 'Custom branding' },
]

export default function PlanCard({ plan, currentPlan, billingCycle, isOwner, prefill }) {
  const rank = PLAN_ORDER.indexOf(plan.key)
  const currentRank = PLAN_ORDER.indexOf(currentPlan)
  const isCurrent = plan.key === currentPlan
  const isBelowCurrent = rank < currentRank
  const isEnterprise = plan.key === 'ENTERPRISE'
  const canSelfServe = plan.key === 'PRO' || plan.key === 'TEAM'

  const price = plan.pricing ? plan.pricing[billingCycle.toLowerCase()] : null

  return (
    <div
      className={`flex flex-col rounded-2xl border p-6 ${
        isCurrent ? 'border-slate-900 ring-1 ring-slate-500' : 'border-slate-800'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-[var(--color-fp-text-secondary)]">{plan.displayName}</h3>
        {isCurrent && (
          <span className="whitespace-nowrap rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-medium text-white">
            Current plan
          </span>
        )}
      </div>

      <div className="mt-3">
        {isEnterprise ? (
          <span className="text-xl font-medium text-[var(--color-fp-text-primary)]">Custom pricing</span>
        ) : price ? (
          <p className="text-3xl font-semibold text-[var(--color-fp-text-primary)]">
            {formatINR(price)}
            <span className="text-base font-normal text-[var(--color-fp-text-secondary)]">
              /{billingCycle === 'MONTHLY' ? 'mo' : 'yr'}
            </span>
          </p>
        ) : (
          <span className="text-xl font-medium text-[var(--color-fp-text-primary)]">Free</span>
        )}
      </div>

      <ul className="mt-6 flex-1 space-y-2.5 text-sm text-[var(--color-fp-text-secondary)]">
        {FEATURE_ROWS.map((row) => {
          const value = plan.limits[row.key]
          const isBoolean = typeof value === 'boolean'
          const display = isBoolean ? (value ? 'Included' : '-') : formatLimit(value)
          return (
            <li key={row.key} className="flex items-baseline justify-between gap-4">
              <span>{row.label}</span>
              <span className={isBoolean && !value ? 'text-slate-300' : 'font-medium text-[var(--color-fp-text-primary)]'}>
                {display}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="mt-6">
        {!isOwner ? (
          <p className="text-xs text-slate-400">Only the workspace owner can change plans.</p>
        ) : isCurrent ? (
          <button
            type="button"
            disabled
            className="w-full rounded-lg border border-slate-500 py-2 text-sm font-medium text-slate-400"
          >
            Your current plan
          </button>
        ) : isEnterprise ? (
          // No self-serve checkout for Enterprise (see plans.js) — this
          // is a placeholder contact link, not a real intake flow. The
          // proper fix is the "Enterprise manual-subscription admin
          // action" item still on your not-yet-built list.
          <a
            href="mailto:sales@opprine.com?subject=Enterprise%20plan"
            className="block w-full rounded-lg bg-slate-900 py-2 text-center text-sm font-medium text-white hover:bg-slate-800"
          >
            Contact us
          </a>
        ) : isBelowCurrent ? (
          <p className="text-xs text-slate-400">
            To switch to this plan, cancel your current subscription below, then subscribe here once it ends.
          </p>
        ) : canSelfServe ? (
          <UpgradeButton plan={plan.key} billingCycle={billingCycle} prefill={prefill} />
        ) : null}
      </div>
    </div>
  )
}