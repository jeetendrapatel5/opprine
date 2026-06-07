'use client'

// components/landing/Nav.jsx

import { LogoMark, PrimaryButton } from './ui'
import { useScrolled } from './hooks'
import { NAV_LINKS } from './data'
import Link from 'next/link'

export default function Nav({ onCTA }) {
  const scrolled = useScrolled(40)

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-neutral-200/80 bg-white/82 py-3 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/82'
          : 'py-5'
      }`}
      aria-label="Primary navigation"
    >
      <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Client Portal home" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-white dark:focus-visible:ring-offset-neutral-950">
          <LogoMark size={32} />
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-[13px] font-semibold text-neutral-600 transition-colors duration-150 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/signin"
            className="hidden rounded-lg px-4 py-2 text-[13px] font-semibold text-neutral-600 transition-colors duration-150 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 focus-visible:ring-offset-white md:block dark:text-neutral-400 dark:hover:text-white dark:focus-visible:ring-white dark:focus-visible:ring-offset-neutral-950"
          >
            Sign in
          </Link>
          <PrimaryButton onClick={onCTA} className="min-h-10 px-4 py-2 text-[13px] shadow-none">
            Start free
          </PrimaryButton>
        </div>
      </div>
    </nav>
  )
}
