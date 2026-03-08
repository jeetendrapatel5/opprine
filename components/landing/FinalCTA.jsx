'use client'
// ─────────────────────────────────────────────────────────────────────────────
// components/landing/FinalCTA.jsx
// ─────────────────────────────────────────────────────────────────────────────
import { FINAL_CTA } from './data'
import { PrimaryButton } from './ui'

export function FinalCTA({ onCTA }) {
  return (
    <section className="py-20 px-6">
      <div className="reveal max-w-[860px] mx-auto bg-gradient-to-br from-indigo-500/12 to-violet-500/[0.06] border border-indigo-500/20 rounded-[28px] px-8 md:px-16 py-20 text-center relative overflow-hidden">

        {/* Top glow line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/70 to-transparent" />

        {/* Bottom radial glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[150px] rounded-[50%] pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />

        <div className="relative z-10">
          <h2 className="text-[clamp(34px,5vw,58px)] font-black text-slate-50 leading-[1.1] tracking-[-0.03em] mb-4">
            {FINAL_CTA.headline}<br />
            <span className="text-indigo-400 italic font-black">{FINAL_CTA.headlineAccent}</span>
          </h2>
          <p className="text-[16px] text-slate-500 leading-[1.8] max-w-[480px] mx-auto mb-10">
            {FINAL_CTA.subtext}
          </p>
          <PrimaryButton onClick={onCTA} className="!text-[15px] !py-4 !px-10 !shadow-[0_12px_40px_rgba(99,102,241,0.5)]">
            {FINAL_CTA.ctaLabel}
          </PrimaryButton>
          <div className="mt-6 flex justify-center items-center gap-5 flex-wrap">
            {FINAL_CTA.trustBullets.map(b => (
              <span key={b} className="flex items-center gap-1.5 text-[12px] text-slate-700">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5" stroke="#6366f1" strokeWidth="1" />
                  <path d="M3.5 6l1.8 1.8 3-3.2" stroke="#6366f1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// components/landing/Footer.jsx
// ─────────────────────────────────────────────────────────────────────────────
import { FOOTER_LINKS, FOOTER_TAGLINE, FOOTER_COPYRIGHT, FOOTER_MADE_IN } from './data'
import { LogoMark } from './ui'

export function Footer() {
  return (
    <footer className="border-t border-white/[0.04] pt-12 pb-8 px-6">
      <div className="max-w-[1120px] mx-auto">

        {/* Top row */}
        <div className="flex flex-wrap justify-between gap-10 mb-12">

          {/* Brand block */}
          <div className="max-w-[220px]">
            <LogoMark size={28} />
            <p className="mt-3 text-[12px] text-slate-700 leading-[1.8]">{FOOTER_TAGLINE}</p>
          </div>

          {/* Link columns */}
          <div className="flex gap-12 flex-wrap">
            {FOOTER_LINKS.map(({ heading, links }) => (
              <div key={heading}>
                <p className="font-bold text-[11px] text-slate-600 uppercase tracking-[0.1em] mb-3">{heading}</p>
                <div className="flex flex-col gap-2">
                  {links.map(({ label, href }) => (
                    <a
                      key={label}
                      href={href}
                      className="text-[13px] text-slate-700 hover:text-slate-400 transition-colors duration-150"
                    >
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.04] pt-6 flex flex-wrap justify-between items-center gap-3">
          <p className="text-[12px] text-slate-800">{FOOTER_COPYRIGHT}</p>
          <p className="font-mono text-[11px] text-slate-800">{FOOTER_MADE_IN}</p>
        </div>

      </div>
    </footer>
  )
}