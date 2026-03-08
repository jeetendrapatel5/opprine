'use client'
// ─────────────────────────────────────────────────────────────────────────────
// components/landing/Nav.jsx
// ─────────────────────────────────────────────────────────────────────────────
import { NAV_LINKS } from './data'
import { LogoMark, PrimaryButton } from './ui'
import { useScrolled } from './hooks'

export default function Nav({ onCTA }) {
  const scrolled = useScrolled(40)

  return (
    <nav className={`
      fixed top-0 left-0 right-0 z-50 transition-all duration-300
      ${scrolled
        ? 'py-3 bg-[#08090C]/90 backdrop-blur-xl border-b border-white/[0.06]'
        : 'py-5 bg-transparent'
      }
    `}>
      <div className="max-w-[1120px] mx-auto px-6 flex items-center justify-between">

        {/* Logo */}
        <a href="/" aria-label="Freeport home"><LogoMark /></a>

        {/* Links — hidden on mobile */}
        <div className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map(({ label, href }) => (
            <a key={label} href={href} className="text-[13px] font-medium text-slate-500 hover:text-slate-200 transition-colors duration-150">
              {label}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <a href="/signin" className="hidden md:block text-[13px] font-semibold text-slate-500 hover:text-slate-300 transition-colors px-4 py-2">
            Sign in
          </a>
          <PrimaryButton onClick={onCTA} className="!text-[13px] !py-2 !px-5">
            Start free →
          </PrimaryButton>
        </div>

      </div>
    </nav>
  )
}