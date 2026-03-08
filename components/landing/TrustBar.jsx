'use client'
// ─────────────────────────────────────────────────────────────────────────────
// components/landing/TrustBar.jsx
// ─────────────────────────────────────────────────────────────────────────────
import { TRUST_LABEL, TRUST_LOGOS } from './data'

// The logos array is doubled so the ticker can loop seamlessly.
// CSS moves the strip -50% (one full copy), then snaps back invisibly.
export default function TrustBar() {
  const doubled = [...TRUST_LOGOS, ...TRUST_LOGOS]

  return (
    <section className="py-10 overflow-hidden border-t border-b border-white/[0.04] bg-white/[0.01]">
      <p className="text-center text-[11px] font-bold text-slate-700 uppercase tracking-[0.12em] mb-6">
        {TRUST_LABEL}
      </p>
      <div className="relative overflow-hidden">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#08090C] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#08090C] to-transparent z-10 pointer-events-none" />
        {/* Ticker */}
        <div className="flex gap-12 w-max" style={{ animation: 'ticker 24s linear infinite' }}>
          {doubled.map((logo, i) => (
            <span key={i} className="text-[14px] font-black text-slate-800 whitespace-nowrap tracking-tight">
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}