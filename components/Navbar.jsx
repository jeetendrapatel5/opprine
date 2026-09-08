// components/Navbar.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Client Component — needs signOut() which is a browser-side operation.
//
// Design decisions:
// - bg-fp-surface (not bg-fp-base) creates a subtle 1-level lift above the page,
//   making the nav feel "on top of" the workspace rather than part of it.
// - The bottom border uses fp-border to create a clean separation line.
// - "Freeport" in font-display (Fraunces) — the brand name should use the
//   display font. It appears on every page, reinforcing brand identity.
// - The FP logo mark is a minimal 2-letter monogram in the accent color,
//   not a complex icon. Simplicity signals confidence.
// - Settings is in the navbar, not floating in the main content area.
//   Tools should live in consistent places — cognitive load principle.
// ─────────────────────────────────────────────────────────────────────────────
'use client'

import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { Settings, LogOut } from 'lucide-react'

export default function Navbar({ user }) {
  return (
    <nav className="bg-fp-surface border-b border-fp-border sticky top-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">

        {/* ── Brand mark ── */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 group"
        >
          {/* Brand name in Fraunces — makes even the nav feel premium */}
          <span
            className="font-[poppins] text-2xl leading-none text-[#e8ecfff1]"
          >
            <span className="text-3xl">o</span>pprine
          </span>
        </Link>

        {/* ── Right side actions ── */}
        <div className="flex items-center gap-1">

          {/* Settings link — icon + label on md+, icon-only on mobile */}
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-1.5 text-fp-text-secondary hover:text-fp-text-primary text-sm font-medium px-3 py-2 rounded-lg hover:bg-fp-raised transition-colors duration-150"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </Link>

          {/* User's name — shows who is logged in, reinforces identity */}
          <span className="text-fp-text-tertiary text-sm hidden md:block px-2">
            {user.name}
          </span>

          {/* Sign out — uses a ghost button pattern. Destructive-ish actions
              should not draw attention. Users who want it will find it. */}
          <button
            onClick={() => signOut({ callbackUrl: '/signin' })}
            className="flex items-center gap-1.5 text-fp-text-tertiary hover:text-fp-danger text-sm font-medium px-3 py-2 rounded-lg hover:bg-fp-raised transition-colors duration-150"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>

        </div>
      </div>
    </nav>
  )
}