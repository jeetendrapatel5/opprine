'use client'

// components/landing/Pricing.jsx

import { ShieldCheck } from 'lucide-react'
import { PRICING_REFRAME, PRICING_TIERS } from './data'
import { CARD, DiffMarker, MUTED_TEXT, PAGE_MAX, SectionHeader } from './ui'

function PlanFeature({ children, inverted = false }) {
  return (
    <div className="flex items-start gap-3">
      <DiffMarker
        kind="plus"
        className={`h-5 w-5 rounded-md [&>svg]:h-3 [&>svg]:w-3 ${
          inverted ? 'bg-white/10 text-white' : ''
        }`}
      />
      <span className={`text-[13px] font-medium leading-6 ${inverted ? 'text-white/70' : MUTED_TEXT}`}>
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
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#1E6F45] px-5 py-3 text-[14px] font-semibold text-white transition duration-200 hover:bg-[#2C8557] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#17130F]"
      >
        {children}
      </a>
    )
  }

  return (
    <a
      href={href}
      className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[#D9D1C3] bg-white px-5 py-3 text-[14px] font-semibold text-[#17130F] transition duration-200 hover:border-[#B9AF9C] hover:bg-[#F4EEE4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17130F] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
    >
      {children}
    </a>
  )
}

export default function Pricing() {
  return (
    <section id="pricing" className="border-y border-[#E7E0D3] bg-[#F4EEE4]/60 py-20 sm:py-28">
      <div className={PAGE_MAX}>
        <SectionHeader title="Simple pricing for a premium client experience." className="mx-auto max-w-3xl">
          {PRICING_REFRAME}
        </SectionHeader>

        <div className="stagger mx-auto mt-12 grid max-w-5xl gap-4 lg:grid-cols-2">
          {PRICING_TIERS.map((tier) => (
            <article
              key={tier.name}
              className={`relative overflow-hidden rounded-2xl p-6 sm:p-8 ${
                tier.highlight ? 'bg-[#17130F] text-white' : CARD
              }`}
            >
              {tier.badge ? (
                <div
                  className={`absolute right-5 top-5 rounded-full px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] ${
                    tier.highlight ? 'bg-white/10 text-[#4FBE84]' : 'bg-[#E9F4EC] text-[#1E6F45]'
                  }`}
                >
                  {tier.badge}
                </div>
              ) : null}

              <div className="max-w-[76%]">
                <h3 className="text-xl font-semibold">{tier.name}</h3>
                <p className={`mt-2 text-[13px] leading-6 ${tier.highlight ? 'text-white/55' : MUTED_TEXT}`}>
                  {tier.tagline}
                </p>
              </div>

              <div className="mt-8 flex items-end gap-2">
                <span className="font-display text-5xl font-semibold leading-none">{tier.price}</span>
                <span className={`pb-1 text-[13px] ${tier.highlight ? 'text-white/55' : 'text-[#948C7E]'}`}>
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
                <p className={`mt-4 text-center text-[12px] leading-5 ${tier.highlight ? 'text-white/45' : 'text-[#948C7E]'}`}>
                  {tier.note}
                </p>
              ) : null}
            </article>
          ))}
        </div>

        <div className="reveal mx-auto mt-8 flex max-w-3xl flex-col items-center justify-center gap-3 rounded-2xl border border-[#E7E0D3] bg-white px-5 py-4 text-center sm:flex-row sm:text-left">
          <ShieldCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-[#1E6F45]" />
          <p className={`text-[13px] leading-6 ${MUTED_TEXT}`}>
            Both plans include private client links, project progress, file delivery, and approval records. Agency
            adds scale, branding, and priority support.
          </p>
        </div>
      </div>
    </section>
  )
}