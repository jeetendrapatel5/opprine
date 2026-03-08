'use client'
// ─────────────────────────────────────────────────────────────────────────────
// components/landing/Problem.jsx
// ─────────────────────────────────────────────────────────────────────────────
import { PROBLEM_CARDS } from './data'
import { SectionLabel, SectionHeading } from './ui'

export function Problem() {
  return (
    <section className="py-20 px-6 max-w-[1120px] mx-auto">
      <div className="reveal text-center mb-16">
        <SectionLabel>The Problem</SectionLabel>
        <SectionHeading>
          You do great work.<br /><em>Your process doesn&apos;t show it.</em>
        </SectionHeading>
      </div>
      <div className="stagger grid grid-cols-1 md:grid-cols-3 gap-3">
        {PROBLEM_CARDS.map(({ icon, title, desc }) => (
          <div key={title} className="card-hover bg-red-500/[0.04] border border-red-500/10 rounded-2xl p-7">
            <div className="text-3xl mb-4">{icon}</div>
            <h3 className="font-bold text-[16px] text-red-300 mb-2">{title}</h3>
            <p className="text-[13px] text-slate-600 leading-[1.75]">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// components/landing/HowItWorks.jsx
// ─────────────────────────────────────────────────────────────────────────────
import { HOW_STEPS } from './data'

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-6 bg-white/[0.015] border-t border-b border-white/[0.04]">
      <div className="max-w-[1120px] mx-auto">
        <div className="reveal text-center mb-16">
          <SectionLabel>How it works</SectionLabel>
          <SectionHeading>Up and running in<br /><em>three minutes flat.</em></SectionHeading>
        </div>
        <div className="stagger grid grid-cols-1 md:grid-cols-3 gap-5 relative">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-10 left-[22%] right-[22%] h-px bg-gradient-to-r from-indigo-500/30 to-violet-500/30 z-0" />

          {HOW_STEPS.map(({ step, icon, title, desc }) => (
            <div key={step} className="relative z-10 text-center">
              <div className="w-20 h-20 rounded-[20px] mx-auto mb-6 bg-gradient-to-br from-indigo-500/15 to-violet-500/[0.08] border border-indigo-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.1)]">
                <span className="text-2xl">{icon}</span>
              </div>
              <div className="font-mono text-[11px] text-indigo-400 font-medium tracking-[0.06em] mb-2.5">{step}</div>
              <h3 className="font-black text-[18px] text-slate-100 mb-2.5 tracking-tight">{title}</h3>
              <p className="text-[13px] text-slate-600 leading-[1.8]">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// components/landing/Features.jsx
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { FEATURES } from './data'
import { CheckItem } from './ui'
import { PREVIEWS } from './previews'

export function Features() {
  const [active, setActive] = useState(0)
  const feat = FEATURES[active]

  return (
    <section id="features" className="py-20 px-6 max-w-[1120px] mx-auto">
      <div className="reveal text-center mb-14">
        <SectionLabel>Features</SectionLabel>
        <SectionHeading>Everything a client portal<br /><em>should have.</em></SectionHeading>
      </div>

      {/* Tab buttons */}
      <div className="reveal flex justify-center gap-2 mb-12 flex-wrap">
        {FEATURES.map((f, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-full
              font-semibold text-[13px] transition-all duration-200 cursor-pointer
              ${i === active
                ? 'bg-indigo-500/12 border border-indigo-500/40 text-indigo-300'
                : 'bg-transparent border border-white/[0.07] text-slate-500 hover:text-slate-300 hover:border-white/15'
              }
            `}
          >
            <span>{f.icon}</span>{f.label}
          </button>
        ))}
      </div>

      {/* Feature panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
        {/* Text side */}
        <div className="reveal-left">
          <h3 className="text-[clamp(22px,3vw,36px)] font-black text-slate-50 leading-[1.2] tracking-tight mb-4">
            {feat.headline}
          </h3>
          <p className="text-[15px] text-slate-500 leading-[1.85] mb-8">{feat.desc}</p>
          <div className="flex flex-col gap-3">
            {feat.bullets.map(b => <CheckItem key={b} variant="green">{b}</CheckItem>)}
          </div>
        </div>

        {/* Preview side — floats gently */}
        <div className="reveal-right" style={{ animation: 'float2 5s ease-in-out infinite' }}>
          {PREVIEWS[feat.previewKey]}
        </div>
      </div>
    </section>
  )
}