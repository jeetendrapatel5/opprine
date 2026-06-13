// components/landing/ui.jsx
// Shared primitives for the landing page.

import { ArrowRight, Check, Star } from 'lucide-react'

export const PAGE_MAX = 'max-w-[1180px] mx-auto px-5 sm:px-6 lg:px-8'
export const CARD =
  'rounded-lg border border-neutral-200/80 bg-white/80 shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-white/[0.04]'
export const MUTED_TEXT = 'text-neutral-600 dark:text-neutral-400'

export function SectionLabel({ children }) {
  return (
    <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
      {children}
    </span>
  )
}

export function SectionHeading({ children, className = '' }) {
  return (
    <h2
      className={`font-display text-3xl font-semibold leading-[1.08] text-neutral-950 sm:text-4xl lg:text-5xl dark:text-white ${className}`}
    >
      {children}
    </h2>
  )
}

export function SectionHeader({ label, title, children, align = 'center', className = '' }) {
  const alignment = align === 'left' ? 'text-left items-start' : 'text-center items-center'

  return (
    <div className={`reveal flex flex-col ${alignment} ${className}`}>
      {label ? <SectionLabel>{label}</SectionLabel> : null}
      <SectionHeading>{title}</SectionHeading>
      {children ? (
        <p className={`mt-5 max-w-2xl text-[15px] leading-7 ${MUTED_TEXT}`}>
          {children}
        </p>
      ) : null}
    </div>
  )
}

export function PrimaryButton({ children, onClick, href, className = '', icon = true }) {
  const base = `
    group inline-flex min-h-11 items-center justify-center gap-2 rounded-lg
    bg-neutral-950 px-5 py-3 text-[14px] font-semibold text-white
    shadow-[0_18px_44px_rgba(10,10,10,0.18)]
    transition duration-200 hover:bg-neutral-800
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950
    focus-visible:ring-offset-2 focus-visible:ring-offset-white
    dark:bg-white dark:text-neutral-950 dark:shadow-[0_18px_44px_rgba(255,255,255,0.08)]
    dark:hover:bg-neutral-200 dark:focus-visible:ring-white dark:focus-visible:ring-offset-neutral-950
    ${className}
  `
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
  const base = `
    inline-flex min-h-11 items-center justify-center gap-2 rounded-lg
    border border-neutral-300 bg-white/70 px-5 py-3 text-[14px] font-semibold
    text-neutral-800 transition duration-200 hover:border-neutral-400
    hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950
    focus-visible:ring-offset-2 focus-visible:ring-offset-white
    dark:border-white/15 dark:bg-white/[0.03] dark:text-neutral-200 dark:hover:border-white/35
    dark:hover:bg-white/[0.06] dark:focus-visible:ring-white dark:focus-visible:ring-offset-neutral-950
    ${className}
  `

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
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-neutral-950 text-white dark:bg-white dark:text-neutral-950">
        <Check aria-hidden="true" className="h-3.5 w-3.5" />
      </span>
      <span
        className={`text-[13px] font-medium leading-6 ${
          muted ? 'text-neutral-500 dark:text-neutral-500' : MUTED_TEXT
        }`}
      >
        {children}
      </span>
    </div>
  )
}

export function Stars({ count = 5 }) {
  return (
    <div className="flex gap-1" aria-label={`${count} star rating`}>
      {Array.from({ length: count }).map((_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className="h-3.5 w-3.5 fill-neutral-950 text-neutral-950 dark:fill-white dark:text-white"
        />
      ))}
    </div>
  )
}

export function WindowChrome({ url = 'opprine.com', dark = false }) {
  return (
    <div
      className={`flex items-center gap-2 border-b px-3 py-3 ${
        dark
          ? 'border-white/10 bg-neutral-950'
          : 'border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-neutral-900'
      }`}
    >
      <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
      <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
      <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
      <div
        className={`ml-2 flex h-7 flex-1 items-center rounded-md border px-3 ${
          dark
            ? 'border-white/10 bg-white/[0.04]'
            : 'border-neutral-200 bg-white dark:border-white/10 dark:bg-white/[0.04]'
        }`}
      >
        <span className="truncate font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
          {url}
        </span>
      </div>
    </div>
  )
}

export function LogoMark({ size = 32 }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="font-[poppins] font-medium text-2xl leading-none text-neutral-950 dark:text-white"
      >
        <span className="text-3xl">o</span>pprine
      </span>
    </div>
  )
}
