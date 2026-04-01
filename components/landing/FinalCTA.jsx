'use client'
// components/landing/FinalCTA.jsx + Footer

import { FINAL_HEADLINE, FINAL_BODY, FINAL_CTA, FINAL_NOTE, FOOTER_LINKS, FOOTER_TAGLINE, FOOTER_COPYRIGHT } from './data'
import { PrimaryButton, LogoMark } from './ui'

// ── FinalCTA ──────────────────────────────────────────────────────────────────
// Mirrors the opening pain from the hero — full circle moment.
// "Stop sending project updates over WhatsApp" connects directly to Pain Block 1.
export function FinalCTA({ onCTA }) {
  const [line1, line2] = FINAL_HEADLINE.split('\n')
  return (
    <section className="py-24 px-6 border-t border-fp-border">
      <div className="max-w-[740px] mx-auto">

        {/* Card with subtle glow border */}
        <div className="reveal relative rounded-2xl overflow-hidden border border-fp-accent/20 bg-fp-surface text-center px-8 py-16 sm:px-16">

          {/* Accent top line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-fp-accent to-transparent opacity-70" />

          {/* Bottom radial glow */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(123,147,255,0.08) 0%, transparent 70%)' }}
          />

          <div className="relative z-10">
            {/* Headline */}
            <h2 className="font-display font-semibold text-fp-text-primary leading-[1.15] tracking-tight mb-6" style={{ fontSize: 'clamp(28px, 4vw, 46px)' }}>
              {line1}
              <br />
              <span className="text-fp-accent">{line2}</span>
            </h2>

            {/* Body — mirrors the pain */}
            <p className="text-fp-text-secondary text-[15px] leading-[1.85] max-w-[480px] mx-auto mb-8">
              {FINAL_BODY}
            </p>

            {/* CTA */}
            <PrimaryButton onClick={onCTA} className="!py-4 !px-10 !text-[15px] !shadow-[0_12px_40px_rgba(123,147,255,0.45)]">
              {FINAL_CTA}
            </PrimaryButton>

            {/* Reassurance */}
            <p className="text-fp-text-tertiary text-[12px] mt-4">{FINAL_NOTE}</p>
          </div>
        </div>

      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
export function Footer() {
  return (
    <footer className="border-t border-fp-border pt-12 pb-8 px-6">
      <div className="max-w-[1120px] mx-auto">

        {/* Top row */}
        <div className="flex flex-wrap justify-between gap-10 mb-12">

          {/* Brand block */}
          <div className="max-w-[220px]">
            <LogoMark size={30} />
            <p className="mt-3 text-fp-text-tertiary text-[12px] leading-[1.8]">
              {FOOTER_TAGLINE}
            </p>
          </div>

          {/* Link columns */}
          <div className="flex gap-12 flex-wrap">
            {FOOTER_LINKS.map(({ heading, links }) => (
              <div key={heading}>
                <p className="text-fp-text-tertiary text-[10px] font-bold uppercase tracking-[0.12em] mb-3">
                  {heading}
                </p>
                <div className="flex flex-col gap-2">
                  {links.map(({ label, href }) => (
                    <a
                      key={label}
                      href={href}
                      className="text-[13px] text-fp-text-tertiary hover:text-fp-text-secondary transition-colors duration-150"
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
        <div className="border-t border-fp-border pt-6 flex flex-wrap justify-between items-center gap-3">
          <p className="text-fp-text-tertiary text-[12px]">{FOOTER_COPYRIGHT}</p>
          <p className="text-fp-text-tertiary text-[11px] font-mono">Made with ♥ in India</p>
        </div>

      </div>
    </footer>
  )
}