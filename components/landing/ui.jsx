// ─────────────────────────────────────────────────────────────────────────────
// components/landing/ui.jsx
//
// Reusable "atoms" — tiny components used in many sections.
// Change a component here and every section that uses it updates automatically.
// ─────────────────────────────────────────────────────────────────────────────

// ── SectionLabel ──────────────────────────────────────────────────────────────
// The small ALL-CAPS tag above every section heading, e.g. "FEATURES"
export function SectionLabel({ children }) {
  return (
    <span className="block text-[11px] font-bold text-indigo-400 uppercase tracking-[0.15em] mb-3">
      {children}
    </span>
  )
}

// ── SectionHeading ────────────────────────────────────────────────────────────
// The large display heading used in every section.
// Wrap a word in <em> to render it in italic indigo accent color.
// Example: <SectionHeading>Up and running in <em>three minutes.</em></SectionHeading>
export function SectionHeading({ children, className = '' }) {
  return (
    <h2 className={`
      text-[clamp(30px,4vw,50px)] font-black text-slate-50
      leading-[1.1] tracking-[-0.03em]
      [&>em]:not-italic [&>em]:text-indigo-400
      ${className}
    `}>
      {children}
    </h2>
  )
}

// ── PrimaryButton ─────────────────────────────────────────────────────────────
// The main indigo CTA button. Has a shimmer sweep on hover.
// Use `href` to render as an <a> tag instead of <button>.
export function PrimaryButton({ children, onClick, href, className = '' }) {
  const base = `
    btn-shimmer relative overflow-hidden inline-flex items-center justify-center
    px-7 py-3.5 rounded-[13px] font-bold text-[14px] text-white
    bg-gradient-to-br from-indigo-500 to-violet-600
    shadow-[0_8px_28px_rgba(99,102,241,0.4)]
    hover:shadow-[0_12px_36px_rgba(99,102,241,0.55)]
    hover:-translate-y-0.5 transition-all duration-200
    cursor-pointer border-none select-none
    ${className}
  `
  if (href) return <a href={href} className={base}>{children}</a>
  return <button onClick={onClick} className={base}>{children}</button>
}

// ── GhostButton ───────────────────────────────────────────────────────────────
// Secondary outlined button.
export function GhostButton({ children, onClick, className = '' }) {
  return (
    <button onClick={onClick} className={`
      inline-flex items-center justify-center
      px-6 py-3.5 rounded-[13px] font-semibold text-[14px]
      text-slate-400 hover:text-slate-100
      bg-transparent border border-white/[0.08] hover:border-white/20
      transition-all duration-150 cursor-pointer
      ${className}
    `}>
      {children}
    </button>
  )
}

// ── CheckItem ─────────────────────────────────────────────────────────────────
// A checkmark icon + label. Used in Features bullets and Pricing feature lists.
// variant: 'green' | 'indigo' | 'indigo-soft'
export function CheckItem({ children, variant = 'green' }) {
  const map = {
    'green':      { bg: 'bg-emerald-500/10',  stroke: '#22c55e' },
    'indigo':     { bg: 'bg-indigo-500/10',   stroke: '#6366f1' },
    'indigo-soft':{ bg: 'bg-indigo-400/[0.15]', stroke: '#a5b4fc' },
  }
  const c = map[variant] || map.green
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-[18px] h-[18px] rounded-[5px] flex-shrink-0 flex items-center justify-center ${c.bg}`}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 5L3.5 7.5L9 2" stroke={c.stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className="text-[13px] text-slate-500 font-medium">{children}</span>
    </div>
  )
}

// ── StarRating ────────────────────────────────────────────────────────────────
// Renders `count` filled amber stars. Used in testimonial cards.
export function StarRating({ count = 5 }) {
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} width="12" height="12" viewBox="0 0 12 12" fill="#f59e0b">
          <path d="M6 1l1.4 2.9 3.1.4-2.3 2.2.6 3.1L6 8.2l-2.8 1.4.6-3.1L1.5 4.3l3.1-.4L6 1z" />
        </svg>
      ))}
    </div>
  )
}

// ── WindowChrome ──────────────────────────────────────────────────────────────
// macOS-style traffic-light dots + fake URL bar. Used in all browser mockups.
export function WindowChrome({ url = 'app.freeport.dev' }) {
  return (
    <div className="flex items-center gap-2 bg-[#161b27] px-4 py-3 border-b border-white/[0.05]">
      <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
      <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
      <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
      <div className="flex-1 ml-2 bg-white/[0.04] rounded-md h-[22px] flex items-center px-2.5">
        <span className="font-mono text-[11px] text-slate-600">{url}</span>
      </div>
    </div>
  )
}

// ── LogoMark ──────────────────────────────────────────────────────────────────
// Freeport icon + wordmark. Used in Nav and Footer.
export function LogoMark({ size = 30, showName = true }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="rounded-[9px] flex-shrink-0 bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20"
        style={{ width: size, height: size }}
      >
        <svg width={size * 0.47} height={size * 0.47} viewBox="0 0 24 24" fill="white">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </div>
      {showName && (
        <span className="font-black text-[15px] text-slate-50 tracking-[-0.03em]">Freeport</span>
      )}
    </div>
  )
}