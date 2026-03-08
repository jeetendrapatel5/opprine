'use client'
// ─────────────────────────────────────────────────────────────────────────────
// components/landing/Hero.jsx
// ─────────────────────────────────────────────────────────────────────────────
import { HERO_BADGE, HERO_LINE_1, HERO_TYPED, HERO_SUBTEXT, HERO_TRUST } from './data'
import { PrimaryButton, GhostButton, WindowChrome } from './ui'
import { useTypewriter } from './hooks'

// ── DashboardMockup ───────────────────────────────────────────────────────────
// The browser window preview that floats below the headline.
// All values here are visual-only and purely hardcoded for appearance.
function DashboardMockup() {
  const statCells = [
    { n: '4', label: 'Total',  color: 'text-indigo-400'  },
    { n: '2', label: 'Active', color: 'text-emerald-400' },
    { n: '1', label: 'Done',   color: 'text-violet-400'  },
  ]
  const projectRows = [
    { pct: 62,  color: 'bg-emerald-500' },
    { pct: 85,  color: 'bg-indigo-500'  },
    { pct: 100, color: 'bg-emerald-500' },
  ]

  return (
    <div className="
      rounded-[20px] overflow-hidden border border-white/[0.08]
      shadow-[0_40px_120px_rgba(0,0,0,0.7),0_0_0_1px_rgba(99,102,241,0.08)]
      bg-[#0d1117] relative
    ">
      <WindowChrome url="app.freeport.dev/dashboard" />

      <div className="flex" style={{ height: 320 }}>
        {/* Sidebar */}
        <div className="w-12 bg-[#0d1117] border-r border-white/[0.05] flex flex-col items-center gap-3 py-4">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
          </div>
          {[0,1,2,3].map(i => <div key={i} className={`w-5 h-5 rounded-md ${i === 0 ? 'bg-indigo-500/20' : 'bg-white/[0.04]'}`} />)}
        </div>

        {/* Main content */}
        <div className="flex-1 p-5 overflow-hidden">
          {/* Header skeleton */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="h-3.5 w-44 rounded bg-white/10 mb-1.5" />
              <div className="h-2 w-28 rounded bg-white/[0.04]" />
            </div>
            <div className="h-7 w-24 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 opacity-80" />
          </div>

          {/* Stat cells */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {statCells.map(s => (
              <div key={s.label} className="bg-white/[0.03] rounded-xl p-2.5 border border-white/[0.05]">
                <div className={`text-lg font-black ${s.color}`}>{s.n}</div>
                <div className="text-[10px] text-slate-600">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Project rows */}
          {projectRows.map((p, i) => (
            <div key={i} className="bg-white/[0.02] rounded-xl p-2.5 mb-1.5 border border-white/[0.04] flex items-center gap-2.5">
              <div className={`w-[3px] h-7 rounded flex-shrink-0 ${p.color} opacity-80`} />
              <div className="flex-1 min-w-0">
                <div className="h-2 w-3/5 rounded-sm bg-white/[0.12] mb-1.5" />
                <div className="h-[3px] bg-white/[0.05] rounded-full overflow-hidden">
                  <div className={`h-full ${p.color} rounded-full opacity-80`} style={{ width: `${p.pct}%` }} />
                </div>
              </div>
              <div className={`h-[7px] w-7 rounded-full ${p.pct === 100 ? 'bg-emerald-500/20' : 'bg-indigo-500/20'}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Glow line at bottom */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/5 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />
    </div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
export default function Hero({ onCTA }) {
  const typed = useTypewriter(HERO_TYPED)

  return (
    <section className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden pt-20">

      {/* Background glow orbs */}
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', animation: 'glow-pulse 6s ease-in-out infinite' }} />
      <div className="absolute top-[30%] left-[15%] w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', animation: 'glow-pulse 8s ease-in-out infinite 2s' }} />
      <div className="absolute top-[20%] right-[10%] w-[250px] h-[250px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)' }} />

      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Copy block */}
      <div className="relative z-10 text-center max-w-[860px] px-6">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/25 rounded-full px-4 py-1.5 mb-8">
          <span className="bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full px-2.5 py-0.5 text-[10px] font-black text-white uppercase tracking-[0.06em]">New</span>
          <span className="text-[12px] text-slate-400 font-medium">{HERO_BADGE}</span>
        </div>

        {/* Headline */}
        <h1 className="text-[clamp(42px,6.5vw,80px)] font-black text-slate-50 leading-[1.08] tracking-[-0.03em] mb-2">
          {HERO_LINE_1}
        </h1>

        {/* Typewriter line */}
        <h1 className="text-[clamp(42px,6.5vw,80px)] font-black leading-[1.08] tracking-[-0.03em] mb-8" style={{ minHeight: '1.2em' }}>
          <span className="shimmer-text">a {typed}</span>
          <span className="text-indigo-400 font-normal" style={{ animation: 'blink 1s step-end infinite' }}>|</span>
        </h1>

        <p className="text-[clamp(15px,1.8vw,19px)] text-slate-500 font-normal leading-[1.75] max-w-[540px] mx-auto mb-10 tracking-[-0.01em]">
          {HERO_SUBTEXT}
        </p>

        {/* CTAs */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <PrimaryButton onClick={onCTA}>Get started free — no card needed</PrimaryButton>
          <GhostButton>▶ Watch 90-sec demo</GhostButton>
        </div>

        <p className="mt-4 text-[12px] text-slate-700">{HERO_TRUST}</p>
      </div>

      {/* Floating dashboard preview */}
      <div className="relative z-10 w-full max-w-[1000px] mx-auto mt-16 px-6" style={{ animation: 'float 6s ease-in-out infinite' }}>
        <DashboardMockup />
      </div>
    </section>
  )
}