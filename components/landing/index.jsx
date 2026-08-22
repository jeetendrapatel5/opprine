'use client'

// components/landing/index.jsx
// Root component for the Opprine landing page.

import { useScrollReveal } from './hooks'
import Nav from './Nav'
import Hero from './Hero'
import { Problem, Reframe, HowItWorks, Features, PortalMoment } from './Problem'
import Pricing from './Pricing'
import { Testimonials, FAQ } from './Testimonials'
import { FinalCTA, Footer } from './FinalCTA'

const STYLES = `
  .reveal,
  .reveal-left,
  .reveal-right {
    opacity: 0;
    transform: translateY(16px);
    transition:
      opacity 600ms cubic-bezier(.16, 1, .3, 1),
      transform 600ms cubic-bezier(.16, 1, .3, 1);
  }

  .reveal-left { transform: translateX(-16px); }
  .reveal-right { transform: translateX(16px); }

  .reveal.is-visible,
  .reveal-left.is-visible,
  .reveal-right.is-visible {
    opacity: 1;
    transform: none;
  }

  .stagger > * {
    opacity: 0;
    transform: translateY(14px);
    transition:
      opacity 520ms cubic-bezier(.16, 1, .3, 1),
      transform 520ms cubic-bezier(.16, 1, .3, 1);
  }

  .stagger.is-visible > *:nth-child(1) { opacity: 1; transform: none; transition-delay: 0ms; }
  .stagger.is-visible > *:nth-child(2) { opacity: 1; transform: none; transition-delay: 60ms; }
  .stagger.is-visible > *:nth-child(3) { opacity: 1; transform: none; transition-delay: 120ms; }
  .stagger.is-visible > *:nth-child(4) { opacity: 1; transform: none; transition-delay: 180ms; }
  .stagger.is-visible > *:nth-child(5) { opacity: 1; transform: none; transition-delay: 240ms; }
  .stagger.is-visible > *:nth-child(6) { opacity: 1; transform: none; transition-delay: 300ms; }
  .stagger.is-visible > *:nth-child(7) { opacity: 1; transform: none; transition-delay: 360ms; }
  .stagger.is-visible > *:nth-child(8) { opacity: 1; transform: none; transition-delay: 420ms; }

  @media (prefers-reduced-motion: reduce) {
    .reveal,
    .reveal-left,
    .reveal-right,
    .stagger > * {
      opacity: 1;
      transform: none;
      transition: none;
    }
  }
`

export default function LandingPage() {
  useScrollReveal()

  const handleCTA = () => {
    window.location.href = '/signup'
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#FFFAFA] font-body text-[#17130F] antialiased selection:bg-[#17130F] selection:text-white">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <div className="relative z-10">
        <Nav onCTA={handleCTA} />

        <main>
          <Hero onCTA={handleCTA} />
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
    </div>
  )
}