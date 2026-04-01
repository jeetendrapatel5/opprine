'use client'
// components/landing/index.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Root component. Assembles all sections. ~50 lines of logic.
// Fonts come from layout.tsx (Fraunces + DM Sans already loaded).
// No Poppins — we use our design system fonts throughout.
// ─────────────────────────────────────────────────────────────────────────────
import { useScrollReveal } from './hooks'
import Nav          from './Nav'
import Hero         from './Hero'
import { Problem, Reframe, HowItWorks, Features, PortalMoment } from './Problem'
import Pricing      from './Pricing'
import { Testimonials, FAQ } from './Testimonials'
import { FinalCTA, Footer }  from './FinalCTA'

// ── Keyframes & custom utilities ──────────────────────────────────────────────
// Only things that can't be done in Tailwind 4 utility classes.
const STYLES = `
  /* ── Scroll reveal ── */
  .reveal, .reveal-left, .reveal-right {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.6s cubic-bezier(.16,1,.3,1), transform 0.6s cubic-bezier(.16,1,.3,1);
  }
  .reveal-left  { transform: translateX(-24px); }
  .reveal-right { transform: translateX(24px);  }
  .reveal.is-visible, .reveal-left.is-visible, .reveal-right.is-visible {
    opacity: 1; transform: none;
  }

  /* ── Stagger children ── */
  .stagger > * {
    opacity: 0;
    transform: translateY(18px);
    transition: opacity 0.5s cubic-bezier(.16,1,.3,1), transform 0.5s cubic-bezier(.16,1,.3,1);
  }
  .stagger.is-visible > *:nth-child(1) { opacity:1; transform:none; transition-delay:  0ms; }
  .stagger.is-visible > *:nth-child(2) { opacity:1; transform:none; transition-delay: 70ms; }
  .stagger.is-visible > *:nth-child(3) { opacity:1; transform:none; transition-delay:140ms; }
  .stagger.is-visible > *:nth-child(4) { opacity:1; transform:none; transition-delay:210ms; }
  .stagger.is-visible > *:nth-child(5) { opacity:1; transform:none; transition-delay:280ms; }
  .stagger.is-visible > *:nth-child(6) { opacity:1; transform:none; transition-delay:350ms; }

  /* ── Hero notification chips ── */
  @keyframes float-chip {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-6px); }
  }
  @keyframes float-chip-2 {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-8px); }
  }
  .animate-float-chip   { animation: float-chip 4s ease-in-out infinite; }
  .animate-float-chip-2 { animation: float-chip-2 5s ease-in-out infinite 1s; }

  /* ── Button shimmer sweep ── */
  .lp-btn-shimmer::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    transform: translateX(-100%);
    transition: transform 0.5s;
  }
  .lp-btn-shimmer:hover::before { transform: translateX(100%); }
`

export default function LandingPage() {
  useScrollReveal()

  const handleCTA = () => { window.location.href = '/signup' }

  return (
    // Landing page lives in bg-fp-base — the dark dashboard world.
    // Font is DM Sans (--font-body) by default; display elements use font-display (Fraunces).
    // The portal sections internally use portal tokens to create the warm contrast.
    <div className="bg-fp-base text-fp-text-primary overflow-x-hidden min-h-screen font-body">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <Nav onCTA={handleCTA} />

      <main>
        <Hero          onCTA={handleCTA} />
        <Problem />
        <Reframe />
        <HowItWorks />
        <Features />
        <PortalMoment />
        <Testimonials />
        <Pricing />
        <FAQ />
        <FinalCTA onCTA={handleCTA} />
      </main>

      <Footer />
    </div>
  )
}