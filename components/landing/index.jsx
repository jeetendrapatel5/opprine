'use client'
// ─────────────────────────────────────────────────────────────────────────────
// components/landing/index.jsx
//
// THE ROOT COMPONENT. Only ~60 lines of logic here.
// All it does: inject styles, run the scroll hook, assemble sections.
//
// HOW TO ADD A NEW SECTION:
//   1. Create components/landing/MySectionName.jsx
//   2. Import it here
//   3. Drop it into <main> at the right position
//   Done. No other file needs to change.
//
// FONT SETUP (one-time, do this once and forget it):
//   Option A — already done in layout.tsx (recommended):
//     In app/layout.tsx, make sure Poppins is loaded and its CSS variable
//     is on <body>. Then add to tailwind.config.js:
//       fontFamily: { poppins: ['var(--font-poppins)', 'sans-serif'] }
//     And remove the Google Fonts @import from STYLES below.
//
//   Option B — works standalone, no config changes needed:
//     Leave STYLES as-is. The @import loads Poppins from Google Fonts.
//     The font is applied to the .landing-root wrapper and inherited by all children.
// ─────────────────────────────────────────────────────────────────────────────

import { useScrollReveal } from './hooks'
import Nav          from './Nav'
import Hero         from './Hero'
import TrustBar     from './TrustBar'
import Stats        from './Stats'
import { Problem, HowItWorks, Features } from '@/components/landing/Problem'
import Pricing      from '@/components/landing/Pricing'
import Testimonials from '@/components/landing/Testimonials'
import { FinalCTA, Footer } from '@/components/landing/FinalCTA'

// ── CSS ───────────────────────────────────────────────────────────────────────
// All custom keyframes and utility classes that can't be expressed with
// standard Tailwind utilities live here. Injected once via <style>.
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');

  /* ── Keyframes ─────────────────────────────────────────────────────────── */
  @keyframes glow-pulse {
    0%, 100% { opacity: .4; transform: scale(1); }
    50%       { opacity: .7; transform: scale(1.05); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(-0.5deg); }
    50%       { transform: translateY(-14px) rotate(0.5deg); }
  }
  @keyframes float2 {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-10px); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes ticker {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }

  /* ── Shimmer text (hero typewriter) ───────────────────────────────────── */
  .shimmer-text {
    background: linear-gradient(90deg, #e2e8f0 0%, #ffffff 40%, #a5b4fc 60%, #e2e8f0 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 4s linear infinite;
  }

  /* ── Button shimmer sweep ──────────────────────────────────────────────── */
  .btn-shimmer::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
    transform: translateX(-100%);
    transition: transform 0.5s;
  }
  .btn-shimmer:hover::before { transform: translateX(100%); }

  /* ── Card hover ────────────────────────────────────────────────────────── */
  .card-hover {
    transition: transform 0.25s cubic-bezier(.16,1,.3,1),
                box-shadow 0.25s cubic-bezier(.16,1,.3,1),
                border-color 0.25s;
  }
  .card-hover:hover {
    transform: translateY(-4px);
    box-shadow: 0 24px 60px rgba(0,0,0,0.4);
    border-color: rgba(99,102,241,0.3) !important;
  }

  /* ── Scroll reveal ─────────────────────────────────────────────────────── */
  .reveal       { opacity: 0; transform: translateY(28px);  transition: opacity 0.65s cubic-bezier(.16,1,.3,1), transform 0.65s cubic-bezier(.16,1,.3,1); }
  .reveal-left  { opacity: 0; transform: translateX(-28px); transition: opacity 0.65s cubic-bezier(.16,1,.3,1), transform 0.65s cubic-bezier(.16,1,.3,1); }
  .reveal-right { opacity: 0; transform: translateX(28px);  transition: opacity 0.65s cubic-bezier(.16,1,.3,1), transform 0.65s cubic-bezier(.16,1,.3,1); }
  .reveal.is-visible, .reveal-left.is-visible, .reveal-right.is-visible { opacity: 1; transform: none; }

  /* ── Stagger children ──────────────────────────────────────────────────── */
  .stagger > * { opacity: 0; transform: translateY(20px); transition: opacity 0.5s cubic-bezier(.16,1,.3,1), transform 0.5s cubic-bezier(.16,1,.3,1); }
  .stagger.is-visible > *:nth-child(1) { opacity:1; transform:none; transition-delay:  0ms; }
  .stagger.is-visible > *:nth-child(2) { opacity:1; transform:none; transition-delay: 80ms; }
  .stagger.is-visible > *:nth-child(3) { opacity:1; transform:none; transition-delay:160ms; }
  .stagger.is-visible > *:nth-child(4) { opacity:1; transform:none; transition-delay:240ms; }
  .stagger.is-visible > *:nth-child(5) { opacity:1; transform:none; transition-delay:320ms; }
  .stagger.is-visible > *:nth-child(6) { opacity:1; transform:none; transition-delay:400ms; }

  /* ── Scrollbar ─────────────────────────────────────────────────────────── */
  .landing-root ::-webkit-scrollbar       { width: 4px; }
  .landing-root ::-webkit-scrollbar-track { background: #08090C; }
  .landing-root ::-webkit-scrollbar-thumb { background: #1e2433; border-radius: 4px; }
`

// ── LandingPage ───────────────────────────────────────────────────────────────
export default function LandingPage() {
  useScrollReveal() // starts the IntersectionObserver for all .reveal / .stagger elements

  const handleCTA = () => { window.location.href = '/signup' }

  return (
    <div
      className="landing-root bg-[#08090C] text-[#f8fafc] overflow-x-hidden min-h-screen"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <Nav onCTA={handleCTA} />

      <main>
        <Hero         onCTA={handleCTA} />
        <TrustBar />
        <Stats />
        <Problem />
        <HowItWorks />
        <Features />
        <Pricing />
        <Testimonials />
        <FinalCTA onCTA={handleCTA} />
      </main>

      <Footer />
    </div>
  )
}