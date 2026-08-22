// components/landing/ui.jsx
// Shared design tokens + primitives for the Opprine landing page.
//
// Palette (warm paper + a single confident "commit" green, with a muted
// brick/rust reserved for the rare "problem / delay" moment — echoing the
// plus/minus of a git diff, which is literally the product's core mechanic):
//   paper        #FFFAFA   primary background
//   paper-tint   #F4EEE4   alternating section background
//   ink          #17130F   primary text / dark sections
//   muted        #6F675C   secondary text
//   line         #E7E0D3   hairline borders
//   green-600    #1E6F45   accent — CTAs, "add" / progress
//   green-700    #154F32   accent hover
//   green-50     #E9F4EC   accent tint
//   rust-600     #9A3A2A   "problem" marker only — used sparingly
//   rust-50      #F8EAE4   rust tint

import { ArrowRight, Check, Minus, Plus, Star } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Merges Tailwind classes safely so a caller's className can override a
// component's defaults (e.g. Nav shrinking PrimaryButton to a pill) without
// the outcome depending on arbitrary class order in the compiled CSS.
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const PAGE_MAX = 'max-w-[1180px] mx-auto px-5 sm:px-6 lg:px-8'

export const INK = 'text-[#17130F]'
export const MUTED_TEXT = 'text-[#6F675C]'
export const LINE = '#E7E0D3'

export const CARD =
  'rounded-2xl border border-[#E7E0D3] bg-white shadow-[0_1px_2px_rgba(23,19,15,0.03)]'
export const CARD_TINT = 'rounded-2xl border border-[#E7E0D3] bg-[#F4EEE4]/70'

export const ACCENT_TEXT = 'text-[#1E6F45]'
export const ACCENT_BG = 'bg-[#1E6F45]'
export const ACCENT_SOFT_BG = 'bg-[#E9F4EC]'
export const RUST_TEXT = 'text-[#9A3A2A]'
export const RUST_SOFT_BG = 'bg-[#F8EAE4]'

export function SectionLabel({ children, tone = 'ink' }) {
  const toneClass =
    tone === 'invert'
      ? 'border-white/15 bg-white/[0.06] text-white/70'
      : 'border-[#E7E0D3] bg-white text-[#6F675C]'

  return (
    <span
      className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.14em] ${toneClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone === 'invert' ? 'bg-[#4FBE84]' : 'bg-[#1E6F45]'}`} />
      {children}
    </span>
  )
}

export function SectionHeading({ children, className = '', tone = 'ink' }) {
  return (
    <h2
      className={`font-display text-[1.75rem] font-semibold leading-[1.12] tracking-[-0.01em] sm:text-4xl lg:text-[2.75rem] ${
        tone === 'invert' ? 'text-white' : 'text-[#17130F]'
      } ${className}`}
    >
      {children}
    </h2>
  )
}

export function SectionHeader({ label, title, children, align = 'center', className = '', tone = 'ink' }) {
  const alignment = align === 'left' ? 'text-left items-start' : 'text-center items-center'
  const bodyTone = tone === 'invert' ? 'text-white/60' : MUTED_TEXT

  return (
    <div className={`reveal flex flex-col ${alignment} ${className}`}>
      {label ? <SectionLabel tone={tone}>{label}</SectionLabel> : null}
      <SectionHeading tone={tone}>{title}</SectionHeading>
      {children ? (
        <p className={`mt-5 max-w-2xl text-[15px] leading-7 ${bodyTone}`}>{children}</p>
      ) : null}
    </div>
  )
}

export function PrimaryButton({ children, onClick, href, className = '', icon = true }) {
  const base = cn(
    'group inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#1E6F45] px-5 py-3 text-[14px] font-semibold text-white transition duration-200 hover:bg-[#154F32] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6F45] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFAFA]',
    className
  )

  const content = (
    <>
      <span>{children}</span>
      {icon ? (
        <ArrowRight
          aria-hidden="true"
          className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
        />
      ) : null}
    </>
  )

  if (href) {
    return (
      <a href={href} className={base}>
        {content}
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} className={base}>
      {content}
    </button>
  )
}

export function SecondaryButton({ children, onClick, href, className = '' }) {
  const base = cn(
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#D9D1C3] bg-white px-5 py-3 text-[14px] font-semibold text-[#17130F] transition duration-200 hover:border-[#B9AF9C] hover:bg-[#F4EEE4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17130F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFAFA]',
    className
  )

  if (href) {
    return (
      <a href={href} className={base}>
        {children}
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} className={base}>
      {children}
    </button>
  )
}

export function CheckItem({ children, muted = false }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#1E6F45] text-white">
        <Check aria-hidden="true" className="h-3.5 w-3.5" />
      </span>
      <span className={`text-[13px] font-medium leading-6 ${muted ? 'text-[#948C7E]' : MUTED_TEXT}`}>
        {children}
      </span>
    </div>
  )
}

export function Stars({ count = 5 }) {
  return (
    <div className="flex gap-1" aria-label={`${count} star rating`}>
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} aria-hidden="true" className="h-3.5 w-3.5 fill-[#17130F] text-[#17130F]" />
      ))}
    </div>
  )
}

// A small diff-style marker: green "+" for a fix/gain, rust "−" for a cost/problem.
// Used sparingly — it's the one structural device unique to this page, because the
// product's entire premise is translating diffs into meaning.
export function DiffMarker({ kind = 'plus', className = '' }) {
  const isPlus = kind === 'plus'
  return (
    <span
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[13px] font-bold',
        isPlus ? 'bg-[#E9F4EC] text-[#1E6F45]' : 'bg-[#F8EAE4] text-[#9A3A2A]',
        className
      )}
    >
      {isPlus ? <Plus aria-hidden="true" className="h-3.5 w-3.5" /> : <Minus aria-hidden="true" className="h-3.5 w-3.5" />}
    </span>
  )
}

// A monospace "commit hash" chip — the page's structural stand-in for numbered
// markers, since the content here is a record, not a sequence.
export function CommitTag({ children }) {
  return (
    <span className="inline-flex items-center rounded-md bg-[#17130F]/[0.04] px-2 py-1 font-mono text-[11px] font-medium text-[#6F675C]">
      {children}
    </span>
  )
}

export function WindowChrome({ url = 'opprine.com' }) {
  return (
    <div className="flex items-center gap-2 border-b border-[#E7E0D3] bg-[#F4EEE4] px-3 py-2.5">
      <div className="flex h-7 flex-1 items-center rounded-md border border-[#E7E0D3] bg-white px-3">
        <span className="truncate font-mono text-[11px] text-[#948C7E]">{url}</span>
      </div>
    </div>
  )
}

export function LogoMark({ size = 32, invert = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`flex items-center justify-center rounded-[7px] font-mono text-[15px] font-bold ${
          invert ? 'bg-white text-[#17130F]' : 'bg-[#17130F] text-white'
        }`}
        style={{ width: size * 0.72, height: size * 0.72 }}
        aria-hidden="true"
      >
        +
      </span>
      <span
        className={`font-display text-[1.35rem] font-semibold leading-none tracking-[-0.01em] ${
          invert ? 'text-white' : 'text-[#17130F]'
        }`}
      >
        opprine
      </span>
    </div>
  )
}