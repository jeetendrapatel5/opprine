// components/landing/ui.jsx
// Atomic components for the landing page.
// Uses Fraunces (--font-display) and DM Sans (--font-body) from the design system.

// ── SectionLabel ──────────────────────────────────────────────────────────────
export function SectionLabel({ children }) {
  return (
    <span className="block text-[11px] font-bold text-fp-accent uppercase tracking-[0.18em] mb-3">
      {children}
    </span>
  )
}

// ── SectionHeading ────────────────────────────────────────────────────────────
// Wrap words in <em> for the accent italic treatment.
export function SectionHeading({ children, className = '' }) {
  return (
    <h2 className={`
      font-display text-[clamp(28px,3.8vw,48px)] font-semibold
      text-fp-text-primary leading-[1.15] tracking-tight
      [&>em]:not-italic [&>em]:text-fp-accent
      ${className}
    `}>
      {children}
    </h2>
  )
}

// ── PrimaryButton ─────────────────────────────────────────────────────────────
export function PrimaryButton({ children, onClick, href, className = '' }) {
  const base = `
    lp-btn-shimmer relative overflow-hidden inline-flex items-center justify-center gap-2
    px-7 py-3.5 rounded-xl font-semibold text-[14px] text-fp-base
    bg-fp-accent hover:bg-fp-accent-hover
    shadow-[0_8px_28px_rgba(123,147,255,0.35)]
    hover:shadow-[0_12px_40px_rgba(123,147,255,0.5)]
    hover:-translate-y-0.5 transition-all duration-200
    cursor-pointer border-none select-none
    ${className}
  `
  if (href) return <a href={href} className={base}>{children}</a>
  return <button onClick={onClick} className={base}>{children}</button>
}

// ── SecondaryButton ───────────────────────────────────────────────────────────
export function SecondaryButton({ children, onClick, href, className = '' }) {
  const base = `
    inline-flex items-center justify-center gap-2
    px-6 py-3.5 rounded-xl font-medium text-[14px]
    text-fp-text-secondary hover:text-fp-text-primary
    bg-transparent border border-fp-border hover:border-fp-accent/30
    transition-all duration-150 cursor-pointer
    ${className}
  `
  if (href) return <a href={href} className={base}>{children}</a>
  return <button onClick={onClick} className={base}>{children}</button>
}

// ── CheckItem ─────────────────────────────────────────────────────────────────
export function CheckItem({ children, muted = false }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-[18px] h-[18px] rounded flex-shrink-0 flex items-center justify-center bg-fp-accent/15 mt-0.5">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 5L3.5 7.5L9 2" stroke="var(--color-fp-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className={`text-[13px] font-medium leading-snug ${muted ? 'text-fp-text-tertiary' : 'text-fp-text-secondary'}`}>
        {children}
      </span>
    </div>
  )
}

// ── Stars ─────────────────────────────────────────────────────────────────────
export function Stars({ count = 5 }) {
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 12 12" fill="var(--color-fp-warning)">
          <path d="M6 1l1.4 2.9 3.1.4-2.3 2.2.6 3.1L6 8.2l-2.8 1.4.6-3.1L1.5 4.3l3.1-.4L6 1z" />
        </svg>
      ))}
    </div>
  )
}

// ── WindowChrome ──────────────────────────────────────────────────────────────
export function WindowChrome({ url = 'app.freeport.dev', dark = true }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-3 border-b ${dark ? 'bg-fp-surface border-fp-border' : 'bg-fp-portal-raised border-fp-portal-border'}`}>
      <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
      <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
      <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
      <div className={`flex-1 ml-2 rounded-md h-[22px] flex items-center px-2.5 ${dark ? 'bg-fp-raised' : 'bg-fp-portal-surface border border-fp-portal-border'}`}>
        <span className={`font-mono text-[11px] ${dark ? 'text-fp-text-tertiary' : 'text-fp-portal-text-tertiary'}`}>{url}</span>
      </div>
    </div>
  )
}

// ── LogoMark ──────────────────────────────────────────────────────────────────
export function LogoMark({ size = 30 }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="rounded-lg flex-shrink-0 bg-fp-accent flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className="font-bold text-fp-base" style={{ fontSize: size * 0.37, lineHeight: 1, letterSpacing: '-0.03em' }}>FP</span>
      </div>
      <span className="font-display font-medium text-fp-text-primary tracking-tight" style={{ fontSize: size * 0.57 }}>
        Freeport
      </span>
    </div>
  )
}