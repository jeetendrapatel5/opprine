'use client'
// components/landing/Pricing.jsx
// ─────────────────────────────────────────────────────────────────────────────
// No monthly/annual toggle. Toggle adds friction and cognitive load.
// We show monthly pricing directly. The reframe line above the cards does the
// conversion work — "one late payment costs more than a full year of Freeport."
// ─────────────────────────────────────────────────────────────────────────────
import { PRICING_REFRAME, PRICING_TIERS } from './data'
import { SectionLabel, SectionHeading, CheckItem, PrimaryButton } from './ui'

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 px-6 bg-fp-surface/40 border-t border-b border-fp-border">
      <div className="max-w-[860px] mx-auto">

        {/* Header */}
        <div className="reveal text-center mb-4">
          <SectionLabel>Pricing</SectionLabel>
          <SectionHeading>Simple. No surprises.</SectionHeading>
        </div>

        {/* ROI reframe — pre-empts the price objection BEFORE showing price */}
        <p className="reveal text-center text-fp-text-secondary text-[14px] leading-relaxed mb-12 max-w-[480px] mx-auto">
          {PRICING_REFRAME}
        </p>

        {/* Tier cards */}
        <div className="stagger grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRICING_TIERS.map(tier => (
            <div
              key={tier.name}
              className={`
                relative rounded-xl p-7 overflow-hidden
                ${tier.highlight
                  ? 'bg-fp-accent-muted border border-fp-accent/30'
                  : 'bg-fp-surface border border-fp-border'
                }
              `}
            >
              {/* Accent top line for highlighted card */}
              {tier.highlight && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-fp-accent opacity-60" />
              )}

              {/* Badge */}
              {tier.badge && (
                <div className="absolute top-4 right-4 bg-fp-accent text-fp-base text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                  {tier.badge}
                </div>
              )}

              {/* Plan name + tagline */}
              <div className="mb-5">
                <h3 className="text-fp-text-primary font-semibold text-[18px] mb-1">{tier.name}</h3>
                <p className="text-fp-text-tertiary text-[13px]">{tier.tagline}</p>
              </div>

              {/* Price — Fraunces for the number */}
              <div className="flex items-baseline gap-1.5 mb-7">
                <span className="font-display text-[48px] font-semibold text-fp-text-primary leading-none tracking-tight">
                  {tier.price}
                </span>
                <span className="text-fp-text-tertiary text-[13px]">{tier.per}</span>
              </div>

              {/* Features */}
              <div className="space-y-2.5 mb-7">
                {tier.features.map(f => (
                  <CheckItem key={f}>{f}</CheckItem>
                ))}
              </div>

              {/* CTA */}
              {tier.highlight ? (
                <PrimaryButton href={tier.ctaHref} className="w-full !justify-center">
                  {tier.ctaLabel}
                </PrimaryButton>
              ) : (
                <a
                  href={tier.ctaHref}
                  className="
                    w-full flex items-center justify-center
                    py-3 rounded-xl font-semibold text-[14px]
                    text-fp-text-secondary border border-fp-border
                    hover:border-fp-accent/30 hover:text-fp-text-primary
                    transition-all duration-150
                  "
                >
                  {tier.ctaLabel}
                </a>
              )}

              {/* Note below Pro CTA — visible, not fine print */}
              {tier.note && (
                <p className="text-fp-text-tertiary text-[11px] text-center mt-3 leading-relaxed">
                  {tier.note}
                </p>
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}