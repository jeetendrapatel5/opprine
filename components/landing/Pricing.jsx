'use client'
// ─────────────────────────────────────────────────────────────────────────────
// components/landing/Pricing.jsx
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { PRICING_TIERS, PRICING_NOTE, CURRENCY, INR_RATE } from './data'
import { SectionLabel, SectionHeading, PrimaryButton, CheckItem } from './ui'

export default function Pricing() {
  const [annual, setAnnual] = useState(true)

  return (
    <section id="pricing" className="py-20 px-6 bg-white/[0.015] border-t border-white/[0.04]">
      <div className="max-w-[860px] mx-auto">

        {/* Header */}
        <div className="reveal text-center mb-12">
          <SectionLabel>Pricing</SectionLabel>
          <SectionHeading>Simple. No surprises.<br /><em>Start free today.</em></SectionHeading>

          {/* Monthly / Annual toggle */}
          <div className="inline-flex items-center gap-1 mt-6 bg-white/[0.04] rounded-full p-1.5 border border-white/[0.07]">
            {['Monthly', 'Annually'].map((label, i) => {
              const isAnnual = i === 1
              const isActive = annual === isAnnual
              return (
                <button
                  key={label}
                  onClick={() => setAnnual(isAnnual)}
                  className={`
                    px-5 py-2 rounded-full font-semibold text-[13px] transition-all duration-200 cursor-pointer
                    ${isActive ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500 hover:text-slate-300'}
                  `}
                >
                  {label}
                  {isAnnual && (
                    <span className="ml-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full">-25%</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tier cards */}
        <div className="stagger grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRICING_TIERS.map(tier => {
            const price = annual ? tier.annualPrice : tier.monthlyPrice
            const inr   = price * INR_RATE
            const savings = (tier.monthlyPrice - tier.annualPrice) * INR_RATE * 12

            return (
              <div
                key={tier.name}
                className={`
                  card-hover rounded-2xl p-8 relative overflow-hidden
                  ${tier.highlight
                    ? 'bg-gradient-to-b from-indigo-500/12 to-violet-500/[0.06] border border-indigo-500/25'
                    : 'bg-white/[0.02] border border-white/[0.07]'
                  }
                `}
              >
                {/* Top glow line for highlighted card */}
                {tier.highlight && (
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />
                )}

                {/* Badge */}
                {tier.badge && (
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
                    {tier.badge}
                  </div>
                )}

                {/* Plan name */}
                <div className="mb-6">
                  <h3 className="font-black text-[18px] text-slate-50 mb-1.5">{tier.name}</h3>
                  <p className="text-[13px] text-slate-500 leading-[1.7]">{tier.desc}</p>
                </div>

                {/* Price */}
                <div className="mb-7">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[52px] font-black text-slate-50 leading-none tracking-[-0.04em]">
                      {price === 0 ? `${CURRENCY}0` : `${CURRENCY}${inr}`}
                    </span>
                    {price > 0 && <span className="text-[13px] text-slate-500 mb-1">/ month</span>}
                    {price === 0 && <span className="text-[13px] text-slate-500 mb-1">forever</span>}
                  </div>
                  {annual && price > 0 && (
                    <p className="text-[11px] text-emerald-400 mt-1">
                      Billed {CURRENCY}{inr * 12}/yr · saves {CURRENCY}{savings}
                    </p>
                  )}
                </div>

                {/* Features */}
                <div className="flex flex-col gap-2.5 mb-8">
                  {tier.features.map(f => (
                    <CheckItem key={f} variant={tier.highlight ? 'indigo-soft' : 'indigo'}>{f}</CheckItem>
                  ))}
                </div>

                {/* CTA */}
                {tier.highlight
                  ? <PrimaryButton href={tier.ctaHref} className="w-full !justify-center">{tier.ctaLabel}</PrimaryButton>
                  : (
                    <a
                      href={tier.ctaHref}
                      className="w-full flex items-center justify-center py-3 rounded-xl font-bold text-[14px] text-slate-400 hover:text-slate-100 border border-white/10 hover:border-white/20 transition-all duration-150"
                    >
                      {tier.ctaLabel}
                    </a>
                  )
                }
              </div>
            )
          })}
        </div>

        <p className="reveal text-center mt-5 text-[12px] text-slate-700">{PRICING_NOTE}</p>
      </div>
    </section>
  )
}