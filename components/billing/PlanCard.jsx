'use client'

// components/billing/PlanCard.jsx
//
// Renders one plan: name, price, a limits list, and whichever call-to-action
// fits the viewer's situation relative to this plan. `plan` is a plain,
// pre-serialized object built server-side in
// app/dashboard/settings/billing/page.jsx from lib/billing/plans.js — this
// component never imports plans.js directly (see UpgradeButton.jsx for why).
//
// Two layouts, one component:
//   - default: a vertical card (Free / Pro / Team)
//   - wide:    one horizontal band (used for Enterprise, which has no
//              self-serve checkout and no price, so it doesn't need a
//              full column of its own)
//
// What did NOT change from the old file: the plan-rank logic, the price
// lookup (plan.offers[currency][billingCycle]) and the order of the
// call-to-action branches. Only presentation changed. Two small display
// corrections are marked "DISPLAY FIX" below.

import UpgradeButton from './UpgradeButton'
import { formatMoney, formatLimit } from '@/lib/billing/format'
import { buttonStyles, CheckIcon, StatusDot } from './ui'

// Display order only — NOT a source of truth for limits or pricing.
// Those live in exactly one place: lib/billing/plans.js.
const PLAN_ORDER = ['FREE', 'PRO', 'TEAM', 'ENTERPRISE']

// Which plan gets the "Recommended" treatment. Purely a display choice —
// it changes no pricing, limits or entitlements. FLAGGED ASSUMPTION: I
// picked PRO because it is the first paid plan. Change it here if you
// would rather point people at TEAM.
const RECOMMENDED_PLAN = 'PRO'

const FEATURE_ROWS = [
  { key: 'maxProjects', label: 'Projects' },
  { key: 'maxClients', label: 'Clients' },
  { key: 'maxWorkspaceMembers', label: 'Workspace members' },
  { key: 'githubIntegration', label: 'GitHub commit summaries' },
  { key: 'customBranding', label: 'Custom branding' },
]

// Turns a raw limit value into something the UI can draw.
// Booleans become "included / not included"; numbers and null (= unlimited)
// go through formatLimit exactly as before.
function describeLimit(value) {
  if (typeof value === 'boolean') {
    return { isBoolean: true, included: value, text: null }
  }
  return { isBoolean: false, included: false, text: formatLimit(value) }
}

// The value on the right-hand side of a feature row.
// `showText` is true in the wide layout, where "Included" is spelled out;
// in the narrow cards a check mark is enough (screen readers still get the
// word through the sr-only span).
function FeatureValue({ item, showText = false }) {
  if (item.isBoolean) {
    if (item.included) {
      return (
        <span className="inline-flex items-center gap-1.5 text-fp-text-primary">
          <CheckIcon />
          <span className={showText ? 'text-sm font-medium' : 'sr-only'}>Included</span>
        </span>
      )
    }
    return (
      <span>
        <span aria-hidden="true" className="text-fp-text-tertiary">
          —
        </span>
        <span className="sr-only">Not included</span>
      </span>
    )
  }
  return <span className="font-medium tabular-nums text-fp-text-primary">{item.text}</span>
}

// The price area. It handles four cases, in this order:
//   Enterprise -> "Custom pricing"
//   has a price -> amount + /mo or /yr, with a "Billed ..." caption
//   FREE plan   -> "Free"
//   anything else -> "Unavailable"
//
// DISPLAY FIX: the old file printed "Free" whenever there was no price,
// which meant a paid plan whose price could not be found (for example a
// missing yearly offer) was labelled "Free". Now only the FREE plan says it.
function Price({ plan, price, currency, billingCycle }) {
  if (plan.key === 'ENTERPRISE') {
    return (
      <p className="flex h-10 items-center text-2xl font-medium tracking-tight text-fp-text-primary">
        Custom pricing
      </p>
    )
  }

  if (price) {
    return (
      <>
        <p className="flex h-10 items-baseline gap-1.5">
          <span className="text-[32px] font-medium leading-10 tracking-tight tabular-nums text-fp-text-primary">
            {formatMoney(price, currency)}
          </span>
          <span className="text-sm text-fp-text-secondary">/{billingCycle === 'MONTHLY' ? 'mo' : 'yr'}</span>
        </p>
        <p className="mt-1 h-5 text-xs leading-5 text-fp-text-secondary">
          Billed {billingCycle === 'MONTHLY' ? 'monthly' : 'yearly'}
        </p>
      </>
    )
  }

  if (plan.key === 'FREE') {
    return (
      <p className="flex h-10 items-center text-[32px] font-medium leading-10 tracking-tight text-fp-text-primary">
        Free
      </p>
    )
  }

  return <p className="flex h-10 items-center text-base text-fp-text-secondary">Unavailable</p>
}

export default function PlanCard({
  plan,
  currentPlan,
  billingCycle,
  currency,
  isOwner,
  prefill,
  index = 0, // position on the page, only used to stagger the entrance
  wide = false,
}) {
  const rank = PLAN_ORDER.indexOf(plan.key)
  const currentRank = PLAN_ORDER.indexOf(currentPlan)
  const isCurrent = plan.key === currentPlan
  const isBelowCurrent = rank < currentRank
  const isEnterprise = plan.key === 'ENTERPRISE'
  const canSelfServe = plan.key === 'PRO' || plan.key === 'TEAM'
  const isRecommended = plan.key === RECOMMENDED_PLAN

  const offer = plan.offers?.[currency]?.[billingCycle] ?? null
  const price = offer ? offer.amount : null

  const features = FEATURE_ROWS.map((row) => ({ ...row, ...describeLimit(plan.limits[row.key]) }))
  const titleId = `plan-title-${plan.key}`

  // ── Which call-to-action to show ──────────────────────────────────────
  // Same branches, same order as before, with one difference: the
  // "current plan" box is now shown to everyone (including non-owners),
  // and non-owners get no buttons on the other cards. The "only the
  // owner can change plans" notice now appears once, at the top of the
  // list, instead of being repeated on every card.
  let action = null
  if (isCurrent) {
    action = (
      <div className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-fp-text-primary/10 px-4 text-sm text-fp-text-secondary">
        <StatusDot tone="success" />
        Your current plan
      </div>
    )
  } else if (!isOwner) {
    action = null
  } else if (isEnterprise) {
    // No self-serve checkout for Enterprise (see plans.js) — this is a
    // placeholder contact link, not a real intake flow. The proper fix is
    // the "Enterprise manual-subscription admin action" item still on your
    // not-yet-built list.
    action = (
      <a
        href="mailto:sales@opprine.com?subject=Enterprise%20plan"
        className={`${buttonStyles.secondary} w-full`}
      >
        Contact us
      </a>
    )
  } else if (isBelowCurrent || currentPlan !== 'FREE') {
    action = (
      <p className="text-xs leading-5 text-fp-text-secondary">
        To switch to this plan,{' '}
        <a
          href="#manage-subscription"
          className="text-fp-text-primary underline underline-offset-2 transition-colors hover:text-fp-accent"
        >
          cancel your current subscription
        </a>{' '}
        below, then subscribe here once it ends.
      </p>
    )
  } else if (canSelfServe && !offer?.available) {
    // DISPLAY FIX: the old message said "This billing is not available...
    // Choose monthly billing" even when MONTHLY was the unavailable one.
    action = (
      <p className="text-xs leading-5 text-fp-text-secondary">
        {billingCycle === 'YEARLY'
          ? 'Yearly billing isn’t available for this plan. Choose monthly billing.'
          : 'Monthly billing isn’t available for this plan right now.'}
      </p>
    )
  } else if (canSelfServe) {
    action = (
      <UpgradeButton
        plan={plan.key}
        billingCycle={billingCycle}
        currency={currency}
        prefill={prefill}
        variant={isRecommended ? 'primary' : 'secondary'}
      />
    )
  }

  // ── Card surface ──────────────────────────────────────────────────────
  // Depth comes from surface steps and hairlines only (no shadows):
  //   recommended -> one step lighter (fp-raised) with a faint accent edge
  //   current     -> a stronger neutral edge
  //   others      -> fp-surface with a hairline that brightens on hover
  // Accent colour means "the thing to do", so the current plan (a state,
  // not an action) uses a neutral edge instead.
  const surface = isRecommended ? 'bg-fp-raised' : 'bg-fp-surface'
  const edge = isCurrent
    ? 'border-fp-text-primary/30'
    : isRecommended
      ? 'border-fp-accent/30'
      : 'border-fp-text-primary/10 hover:border-fp-text-primary/20'

  // ── Wide layout (Enterprise) ──────────────────────────────────────────
  if (wide) {
    return (
      <article
        aria-labelledby={titleId}
        aria-current={isCurrent ? 'true' : undefined}
        style={{ '--i': index }}
        className={`fp-rise rounded-xl border transition-colors duration-150 ${surface} ${edge}`}
      >
        <div className="grid gap-6 p-6 @3xl:grid-cols-[minmax(0,14rem)_1fr_11rem] @3xl:items-center @3xl:gap-8">
          <div>
            <h3 id={titleId} className="text-base font-medium text-fp-text-primary">
              {plan.displayName}
            </h3>
            <div className="mt-2">
              <Price plan={plan} price={price} currency={currency} billingCycle={billingCycle} />
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 @xl:grid-cols-3 @4xl:grid-cols-5">
            {features.map((item) => (
              <div key={item.key}>
                <dt className="text-xs text-fp-text-secondary">{item.label}</dt>
                <dd className="mt-1 text-sm">
                  <FeatureValue item={item} showText />
                </dd>
              </div>
            ))}
          </dl>

          {action && <div>{action}</div>}
        </div>
      </article>
    )
  }

  // ── Default layout (vertical card) ────────────────────────────────────
  return (
    <article
      aria-labelledby={titleId}
      aria-current={isCurrent ? 'true' : undefined}
      style={{ '--i': index }}
      className={`fp-rise flex flex-col rounded-xl border p-6 transition-colors duration-150 ${surface} ${edge}`}
    >
      {/* Fixed-height header + price blocks keep the limits list starting
          at the same height in every card, so rows line up across plans. */}
      <div className="flex h-6 items-center justify-between gap-2">
        <h3 id={titleId} className="text-base font-medium text-fp-text-primary">
          {plan.displayName}
        </h3>
        {isRecommended && !isCurrent && (
          <span className="rounded-md bg-fp-accent-muted px-2 py-0.5 text-xs font-medium text-fp-accent">
            Recommended
          </span>
        )}
      </div>

      <div className="mt-4 h-16">
        <Price plan={plan} price={price} currency={currency} billingCycle={billingCycle} />
      </div>

      {/* Ledger rows: label, a dotted leader, then the value. The leader
          is not decoration — it keeps the eye connected to the value when
          the card is wide (tablet, single column). */}
      <ul className="mt-6 flex-1 space-y-2 border-t border-fp-text-primary/10 pt-6">
        {features.map((item) => (
          <li key={item.key} className="flex h-6 items-center gap-2 text-sm">
            <span className="text-fp-text-secondary">{item.label}</span>
            <span
              aria-hidden="true"
              className="h-0 flex-1 translate-y-1 border-b border-dotted border-fp-text-primary/20"
            />
            <FeatureValue item={item} />
          </li>
        ))}
      </ul>

      {action && <div className="pt-6">{action}</div>}
    </article>
  )
}