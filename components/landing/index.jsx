'use client'

// components/landing/index.jsx
// Root component for the Client Portal landing experience.

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
    transform: translateY(20px);
    transition:
      opacity 640ms cubic-bezier(.16, 1, .3, 1),
      transform 640ms cubic-bezier(.16, 1, .3, 1);
  }

  .reveal-left { transform: translateX(-20px); }
  .reveal-right { transform: translateX(20px); }

  .reveal.is-visible,
  .reveal-left.is-visible,
  .reveal-right.is-visible {
    opacity: 1;
    transform: none;
  }

  .stagger > * {
    opacity: 0;
    transform: translateY(16px);
    transition:
      opacity 560ms cubic-bezier(.16, 1, .3, 1),
      transform 560ms cubic-bezier(.16, 1, .3, 1);
  }

  .stagger.is-visible > *:nth-child(1) { opacity: 1; transform: none; transition-delay: 0ms; }
  .stagger.is-visible > *:nth-child(2) { opacity: 1; transform: none; transition-delay: 70ms; }
  .stagger.is-visible > *:nth-child(3) { opacity: 1; transform: none; transition-delay: 140ms; }
  .stagger.is-visible > *:nth-child(4) { opacity: 1; transform: none; transition-delay: 210ms; }
  .stagger.is-visible > *:nth-child(5) { opacity: 1; transform: none; transition-delay: 280ms; }
  .stagger.is-visible > *:nth-child(6) { opacity: 1; transform: none; transition-delay: 350ms; }
  .stagger.is-visible > *:nth-child(7) { opacity: 1; transform: none; transition-delay: 420ms; }
  .stagger.is-visible > *:nth-child(8) { opacity: 1; transform: none; transition-delay: 490ms; }

  .landing-grid {
    background-image:
      linear-gradient(rgba(15, 23, 42, 0.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(15, 23, 42, 0.045) 1px, transparent 1px);
    background-size: 72px 72px;
  }

  .dark .landing-grid {
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.055) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.055) 1px, transparent 1px);
  }

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
    <div className="relative min-h-screen overflow-x-hidden bg-white font-body text-neutral-950 antialiased selection:bg-neutral-950 selection:text-white dark:bg-neutral-950 dark:text-neutral-50 dark:selection:bg-white dark:selection:text-neutral-950">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div aria-hidden="true" className="landing-grid pointer-events-none fixed inset-0 opacity-45" />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.72)_38%,rgba(255,255,255,0.94))] dark:bg-[linear-gradient(180deg,rgba(10,10,10,0.94),rgba(10,10,10,0.74)_38%,rgba(10,10,10,0.96))]" />

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
