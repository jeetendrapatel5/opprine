'use client'

// components/landing/Pricing.jsx

import { Check, ShieldCheck } from 'lucide-react'
import { PRICING_REFRAME, PRICING_TIERS } from './data'
import { CARD, MUTED_TEXT, PAGE_MAX, SectionHeader } from './ui'

function PlanFeature({ children, inverted = false }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          inverted
            ? 'bg-white text-neutral-950 dark:bg-neutral-950 dark:text-white'
            : 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
        }`}
      >
        <Check aria-hidden="true" className="h-3.5 w-3.5" />
      </span>
      <span
        className={`text-[13px] font-medium leading-6 ${
          inverted ? 'text-neutral-200 dark:text-neutral-700' : MUTED_TEXT
        }`}
      >
        {children}
      </span>
    </div>
  )
}


function PlanButton({ href, children, highlight }) {
  if (highlight) {
    return (
      <a
        href={href}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-white px-5 py-3 text-[14px] font-semibold text-neutral-950 transition duration-200 hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 dark:bg-neutral-950 dark:text-white dark:hover:bg-neutral-800 dark:focus-visible:ring-neutral-950 dark:focus-visible:ring-offset-white"
      >
        {children}
      </a>
    )
  }

  return (
    <a
      href={href}
      className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-neutral-300 bg-white px-5 py-3 text-[14px] font-semibold text-neutral-800 transition duration-200 hover:border-neutral-400 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/15 dark:bg-white/[0.03] dark:text-neutral-200 dark:hover:border-white/35 dark:hover:bg-white/[0.06] dark:focus-visible:ring-white dark:focus-visible:ring-offset-neutral-950"
    >
      {children}
    </a>
  )
}

export default function Pricing() {
  return (
    <section id="pricing" className="border-y border-neutral-200 bg-neutral-50/70 py-20 dark:border-white/10 dark:bg-white/[0.03] sm:py-24">
      <div className={PAGE_MAX}>
        <SectionHeader label="Pricing" title="Simple pricing for a premium client experience." className="mx-auto max-w-3xl">
          {PRICING_REFRAME}
        </SectionHeader>

        <div className="stagger mx-auto mt-12 grid max-w-5xl gap-4 lg:grid-cols-2">
          {PRICING_TIERS.map((tier) => (
            <article
              key={tier.name}
              className={`relative overflow-hidden rounded-lg p-6 sm:p-8 ${
                tier.highlight
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                  : CARD
              }`}
            >
              {tier.badge ? (
                <div className={`absolute right-5 top-5 rounded-lg px-3 py-1.5 text-[11px] font-semibold ${
                  tier.highlight
                    ? 'bg-white/10 text-white dark:bg-neutral-950/10 dark:text-neutral-950'
                    : 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                }`}>
                  {tier.badge}
                </div>
              ) : null}

              <div className="max-w-[76%]">
                <h3 className="text-xl font-semibold">{tier.name}</h3>
                <p className={`mt-2 text-[13px] leading-6 ${tier.highlight ? 'text-neutral-300 dark:text-neutral-600' : MUTED_TEXT}`}>
                  {tier.tagline}
                </p>
              </div>

              <div className="mt-8 flex items-end gap-2">
                <span className="font-display text-5xl font-semibold leading-none">{tier.price}</span>
                <span className={`pb-1 text-[13px] ${tier.highlight ? 'text-neutral-300 dark:text-neutral-600' : 'text-neutral-500 dark:text-neutral-400'}`}>
                  {tier.per}
                </span>
              </div>

              <div className="mt-8 space-y-3">
                {tier.features.map((feature) => (
                  <PlanFeature key={feature} inverted={tier.highlight}>
                    {feature}
                  </PlanFeature>
                ))}
              </div>

              <div className="mt-8">
                <PlanButton href={tier.ctaHref} highlight={tier.highlight}>
                  {tier.ctaLabel}
                </PlanButton>
              </div>

              {tier.note ? (
                <p className={`mt-4 text-center text-[12px] leading-5 ${tier.highlight ? 'text-neutral-300 dark:text-neutral-600' : 'text-neutral-500 dark:text-neutral-400'}`}>
                  {tier.note}
                </p>
              ) : null}
            </article>
          ))}
        </div>

        <div className="reveal mx-auto mt-8 flex max-w-3xl flex-col items-center justify-center gap-3 rounded-lg border border-neutral-200 bg-white/80 px-5 py-4 text-center dark:border-white/10 dark:bg-white/[0.03] sm:flex-row sm:text-left">
          <ShieldCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-neutral-950 dark:text-white" />
          <p className={`text-[13px] leading-6 ${MUTED_TEXT}`}>
            Both plans include private client links, project progress, file delivery, and approval records. Pro adds scale, branding, and payment workflow.
          </p>
        </div>
      </div>
    </section>
  )
}
