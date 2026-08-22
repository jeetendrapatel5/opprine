'use client'

// components/landing/Nav.jsx

import Link from 'next/link'
import Image from 'next/image'
import { PrimaryButton } from './ui'
import { useScrolled } from './hooks'
import { NAV_LINKS } from './data'

export default function Nav({ onCTA }) {
  const scrolled = useScrolled(24)

  return (
    <div className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <nav
        aria-label="Primary navigation"
        className={`mx-auto flex max-w-[1080px] items-center justify-between rounded-full border border-[#E7E0D3] bg-[#FFFAFA] px-3 py-2 pl-4 transition-shadow duration-300 sm:px-4 ${
          scrolled ? 'shadow-[0_8px_24px_rgba(23,19,15,0.08)]' : ''
        }`}
      >
        <Link
          href="/"
          aria-label="Opprine home"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17130F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFAFA]"
        >
          <Image
            src="/logo/opprine-main-logo.png"
            alt=""
            width={70}
            height={28}
            priority
            className="h-10 w-auto"
          />
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-[13px] font-semibold text-[#6F675C] transition-colors duration-150 hover:text-[#17130F]"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Link
            href="/signin"
            className="hidden rounded-full px-4 py-2 text-[13px] font-semibold text-[#6F675C] transition-colors duration-150 hover:text-[#17130F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17130F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFAFA] md:block"
          >
            Sign in
          </Link>
          <PrimaryButton onClick={onCTA} icon={false} className="min-h-9 rounded-full px-4 py-2 text-[13px]">
            Start free
          </PrimaryButton>
        </div>
      </nav>
    </div>
  )
}