// components/portal/PortalHeader.jsx
// Sticky header: who the portal is from, section links, and a one-tap way to
// get in touch. Server Component; PortalNav is the only client piece.

import { Mail } from 'lucide-react'
import PortalNav from './PortalNav'
import { Button } from './ui'

export default function PortalHeader({ freelancerName, freelancerEmail, navItems }) {
  const name = freelancerName || 'Your developer'
  const initial = name.trim().charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-30 border-b border-fp-portal-border bg-fp-portal-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 px-4 sm:px-6 md:flex-nowrap lg:px-8">
        <div className="flex min-w-0 items-center gap-3 py-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fp-portal-accent-strong font-display text-base font-semibold text-white"
          >
            {initial}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-fp-portal-text-primary">{name}</p>
            <p className="text-xs text-fp-portal-text-muted">Client portal</p>
          </div>
        </div>

        <PortalNav items={navItems} className="order-last min-w-0 basis-full md:order-none md:basis-auto" />

        {freelancerEmail && (
          <Button
            href={`mailto:${freelancerEmail}`}
            icon={Mail}
            aria-label={`Email ${name}`}
            className="px-3 sm:px-4"
          >
            <span className="hidden sm:inline">Contact</span>
          </Button>
        )}
      </div>
    </header>
  )
}
