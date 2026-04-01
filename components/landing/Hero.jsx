'use client'
// components/landing/Hero.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Two-column hero: copy left, product visual right.
// WHY two-column: Centered single-column heroes feel like presentations.
// Two-column heroes feel like products — the visual is already there, already
// real. The visitor registers product AND copy simultaneously, which reduces
// time-to-comprehension and increases conversion.
//
// The dashboard mockup shows the freelancer's world (dark, indigo accents).
// Below it: a small portal notification chip showing "client viewed portal"
// — the specific moment the freelancer most wants to see.
// ─────────────────────────────────────────────────────────────────────────────
import { HERO_PRE, HERO_HEADLINE_1, HERO_HEADLINE_2, HERO_SUB, HERO_CTA, HERO_TRUST } from './data'
import { PrimaryButton, SecondaryButton, WindowChrome } from './ui'

// ── Dashboard Mockup ──────────────────────────────────────────────────────────
function DashboardMockup() {
  return (
    <div className="relative">

      {/* Main dashboard window */}
      <div className="
        rounded-[18px] overflow-hidden border border-fp-border
        shadow-[0_40px_100px_rgba(0,0,0,0.8),0_0_0_1px_rgba(123,147,255,0.06)]
        bg-fp-base
      ">
        <WindowChrome url="app.freeport.dev/dashboard" dark={true} />

        {/* Dashboard content */}
        <div className="p-5">

          {/* Greeting */}
          <div className="mb-5">
            <div className="h-3 w-52 rounded-sm bg-fp-text-primary/10 mb-1.5" />
            <div className="h-2 w-36 rounded-sm bg-fp-text-tertiary/20" />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { n: '4', label: 'Projects', color: 'text-fp-accent' },
              { n: '2', label: 'Active',   color: 'text-fp-success' },
              { n: '1', label: 'Done',     color: 'text-fp-text-secondary' },
            ].map(s => (
              <div key={s.label} className="bg-fp-surface border border-fp-border rounded-xl p-3">
                <div className={`font-display text-2xl font-semibold ${s.color} leading-none mb-1`}>{s.n}</div>
                <div className="text-[10px] text-fp-text-tertiary uppercase tracking-wide font-semibold">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Project rows */}
          {[
            { name: 'Luminary Co. Website', pct: 85, status: 'Active',    statusClass: 'text-fp-accent bg-fp-accent-muted' },
            { name: 'Mehta & Sons Rebrand', pct: 62, status: 'Active',    statusClass: 'text-fp-accent bg-fp-accent-muted' },
            { name: 'Kiran\'s Portfolio',   pct: 100, status: 'Complete', statusClass: 'text-fp-success bg-fp-success/10' },
          ].map((p, i) => (
            <div key={i} className="bg-fp-surface border border-fp-border rounded-xl p-3 mb-2 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] font-medium text-fp-text-primary truncate">{p.name}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${p.statusClass}`}>{p.status}</span>
                </div>
                <div className="h-1.5 bg-fp-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${p.pct}%`, background: p.pct === 100 ? 'var(--color-fp-success)' : 'var(--color-fp-accent)' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating notification chip — the money moment */}
      {/* Shows exactly what the freelancer most wants to see */}
      <div className="
        absolute -bottom-4 -right-4 sm:-bottom-5 sm:-right-6
        bg-fp-surface border border-fp-border rounded-xl px-4 py-3
        shadow-[0_12px_40px_rgba(0,0,0,0.6)]
        flex items-center gap-3
        animate-float-chip
      ">
        <div className="w-2 h-2 rounded-full bg-fp-success flex-shrink-0" />
        <div>
          <p className="text-fp-text-primary text-[11px] font-semibold leading-none mb-0.5">
            Client viewed the portal
          </p>
          <p className="text-fp-text-tertiary text-[10px]">2 hours ago · Luminary Co.</p>
        </div>
      </div>

      {/* Second floating chip — approval */}
      <div className="
        absolute -top-4 -left-4 sm:-top-5 sm:-left-6
        bg-fp-surface border border-fp-success/20 rounded-xl px-4 py-3
        shadow-[0_12px_40px_rgba(0,0,0,0.6)]
        flex items-center gap-3
        animate-float-chip-2
      ">
        <div className="w-2 h-2 rounded-full bg-fp-success flex-shrink-0 animate-pulse" />
        <div>
          <p className="text-fp-success text-[11px] font-semibold leading-none mb-0.5">
            Milestone approved
          </p>
          <p className="text-fp-text-tertiary text-[10px]">Homepage Design · just now</p>
        </div>
      </div>

    </div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
export default function Hero({ onCTA }) {
  return (
    <section className="min-h-screen flex items-center relative overflow-hidden pt-24 pb-16">

      {/* Background glow */}
      <div
        className="absolute top-0 right-[20%] w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(123,147,255,0.08) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-0 left-[10%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(123,147,255,0.05) 0%, transparent 70%)' }}
      />

      {/* Very subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="max-w-[1120px] mx-auto px-6 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* ── Left: Copy ── */}
          <div>
            {/* Pre-headline */}
            <p className="text-fp-accent text-[11px] font-bold uppercase tracking-[0.2em] mb-5">
              {HERO_PRE}
            </p>

            {/* Main headline — two lines, one-two punch */}
            {/* First line: stated truth. Second line: the problem. */}
            <h1 className="font-display font-semibold leading-[1.1] tracking-tight mb-6">
              <span className="text-fp-text-primary block" style={{ fontSize: 'clamp(38px, 5vw, 60px)' }}>
                {HERO_HEADLINE_1}
              </span>
              <span className="text-fp-accent block" style={{ fontSize: 'clamp(38px, 5vw, 60px)' }}>
                {HERO_HEADLINE_2}
              </span>
            </h1>

            {/* Sub-headline */}
            <p className="text-fp-text-secondary text-[16px] leading-[1.8] mb-8 max-w-[460px]">
              {HERO_SUB}
            </p>

            {/* CTAs */}
            <div className="flex items-center gap-3 flex-wrap mb-5">
              <PrimaryButton onClick={onCTA}>
                {HERO_CTA}
              </PrimaryButton>
              <SecondaryButton href="#how-it-works">
                See how it works →
              </SecondaryButton>
            </div>

            {/* Trust line */}
            <p className="text-fp-text-tertiary text-[12px]">
              {HERO_TRUST}
            </p>
          </div>

          {/* ── Right: Product mockup ── */}
          <div className="relative hidden lg:block">
            <DashboardMockup />
          </div>

        </div>
      </div>
    </section>
  )
}