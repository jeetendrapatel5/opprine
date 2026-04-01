'use client'
// components/landing/Nav.jsx
import { LogoMark, PrimaryButton } from './ui'
import { useScrolled } from './hooks'
import { NAV_LINKS } from './data'

export default function Nav({ onCTA }) {
  const scrolled = useScrolled(60)

  return (
    <nav className={`
      fixed top-0 left-0 right-0 z-50 transition-all duration-300
      ${scrolled
        ? 'py-3 bg-fp-base/92 backdrop-blur-xl border-b border-fp-border'
        : 'py-5 bg-transparent'
      }
    `}>
      <div className="max-w-[1120px] mx-auto px-6 flex items-center justify-between">

        {/* Logo */}
        <a href="/" aria-label="Freeport home">
          <LogoMark size={32} />
        </a>

        {/* Nav links — hidden on mobile */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-[13px] font-medium text-fp-text-tertiary hover:text-fp-text-primary transition-colors duration-150"
            >
              {label}
            </a>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <a
            href="/signin"
            className="hidden md:block text-[13px] font-medium text-fp-text-tertiary hover:text-fp-text-secondary transition-colors px-4 py-2"
          >
            Sign in
          </a>
          <PrimaryButton onClick={onCTA} className="!text-[13px] !py-2 !px-5 !rounded-lg">
            Start free →
          </PrimaryButton>
        </div>

      </div>
    </nav>
  )
}