// components/showcase/ShowcaseChrome.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The frame around every showcase page: sticky top bar, contact panel, footer.
// Both page layouts (story on / story off) use ShowcaseShell, so the frame is
// written once.
//
//   <ShowcaseShell project={project}>
//     …the sections that differ between layouts…
//   </ShowcaseShell>
//
// Server component. The only client code on the page is the LeadForm inside
// the contact panel.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import LeadForm from '@/components/LeadForm'
import { pill } from './showcase-utils'

// A slim, translucent bar that stays at the top while scrolling.
function ShowcaseNav({ name }) {
  return (
    <header className="sticky top-0 z-40 border-b border-fp-portal-border/70 bg-fp-portal-bg/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-4 px-6">
        <p className="min-w-0 truncate text-sm font-medium text-fp-portal-text-primary">{name}</p>
        <a href="#contact" className={pill('solid', 'sm')}>Get in touch</a>
      </div>
    </header>
  )
}

// The dark closing panel. Dark background → light button (the colours swap
// with the background, as in the Apple reference).
function ContactSection({ project }) {
  return (
    <section id="contact" className="scroll-mt-12 bg-fp-base px-6 py-24 md:py-32">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-balance font-display text-4xl font-medium tracking-tight text-fp-text-primary md:text-5xl">
          Want results like this?
        </h2>
        <p className="mt-4 text-fp-text-secondary">
          {project.user.name} is currently accepting new projects. Send a message directly below.
        </p>
        <div className="mt-10">
          <LeadForm projectId={project.id} freelancerName={project.user.name} />
        </div>
      </div>
    </section>
  )
}

function ShowcaseFooter() {
  return (
    <footer className="border-t border-fp-border bg-fp-base px-6 py-8 text-center text-xs text-fp-text-secondary">
      Powered by{' '}
      <Link href="/" className="font-medium text-fp-text-primary transition-colors hover:text-fp-accent">
        Opprine
      </Link>
      . The client portal for freelance web developers.
    </footer>
  )
}

export default function ShowcaseShell({ project, children }) {
  return (
    <div className="min-h-screen bg-fp-portal-bg text-fp-portal-text-primary">
      <ShowcaseNav name={project.user.name} />
      <main>
        {children}
        <ContactSection project={project} />
      </main>
      <ShowcaseFooter />
    </div>
  )
}