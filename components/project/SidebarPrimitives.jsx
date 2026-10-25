// components/project/SidebarPrimitives.jsx
//
// Small presentational pieces shared by ProjectSidebar and ProjectInfoPanel.
// No hooks and no 'use client', so they work in server components and inside
// a <button> (everything here renders <span>s, which is valid button content).

import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

// Decorative bar. It is always shown next to a visible "60%" label, so it is
// hidden from screen readers instead of announcing the same number twice.
export function ProgressBar({ value, className }) {
  return (
    <span
      aria-hidden="true"
      className={cn('block h-1.5 overflow-hidden rounded-full bg-fp-base', className)}
    >
      <span
        className="block h-full rounded-full bg-fp-accent transition-[width] duration-300 motion-reduce:transition-none"
        style={{ width: `${value}%` }}
      />
    </span>
  )
}

// Colour is never the only signal: every dot sits next to a text label.
export function StatusDot({ active = false, className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block h-2 w-2 shrink-0 rounded-full',
        active ? 'bg-fp-success ring-2 ring-fp-success/25' : 'bg-fp-text-tertiary',
        className,
      )}
    />
  )
}

const AVATAR_SIZES = {
  sm: 'h-6 w-6 text-[10px]',
  lg: 'h-12 w-12 text-lg',
}

export function ClientAvatar({ initial, size = 'sm' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-fp-accent/20 bg-fp-accent/15 font-bold leading-none text-fp-accent',
        AVATAR_SIZES[size],
      )}
    >
      {initial}
    </span>
  )
}

// Stand-in for content this viewer's role may not see. Saying "restricted" is
// honest; "No client assigned" would be wrong, because the client exists.
export function RestrictedNotice({ children }) {
  return (
    <span className="flex items-center gap-2 text-xs text-fp-text-secondary">
      <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {children}
    </span>
  )
}