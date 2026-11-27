// components/billing/ui.jsx
//
// Small shared pieces used by PlanCard, UpgradeButton and ManageSubscription.
// Before this file existed, each component repeated its own long button
// class string, and they had drifted apart (different heights, radii,
// colours). Now there is one place to change them.
//
// Nothing here has state or hooks, so it works inside both Server and
// Client Components. It does not touch billing logic.
//
// Design rules this file follows:
//   - Colours come only from the --color-fp-* tokens in globals.css
//     (bg-fp-accent, text-fp-text-primary, ...). No raw hex, no slate-*.
//   - Buttons are 40px tall (a comfortable touch target) with 10px
//     corners (rounded-lg in this project's radius scale).
//   - Only named properties transition (never `transition-all`), with one
//     easing curve used across the whole billing UI.

const BUTTON_BASE =
  'inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium ' +
  'transition-[background-color,border-color,color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] ' +
  'active:scale-[0.98] motion-reduce:active:scale-100 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fp-accent ' +
  'disabled:pointer-events-none disabled:opacity-50'

export const buttonStyles = {
  // The one action we want people to notice. Accent fill + dark text uses
  // the same accent/base pairing as the app's other primary buttons.
  primary: `${BUTTON_BASE} bg-fp-accent text-fp-base hover:bg-fp-accent-hover`,
  // Everything else: a quiet outline.
  secondary: `${BUTTON_BASE} border border-fp-text-primary/15 text-fp-text-primary hover:border-fp-text-primary/25 hover:bg-fp-text-primary/5`,
}

// A status dot carries the colour so the sentence next to it can stay in a
// normal, readable text colour. Used for: current plan, subscription
// status, errors and warnings.
const DOT_TONES = {
  success: 'bg-fp-success',
  warning: 'bg-fp-warning',
  danger: 'bg-fp-danger',
  neutral: 'bg-fp-text-secondary',
}

export function StatusDot({ tone = 'neutral', className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-1.5 shrink-0 rounded-full ${DOT_TONES[tone]} ${className}`}
    />
  )
}

// Only used while something is genuinely loading (opening checkout,
// confirming a payment). Turned off for people who ask for reduced motion.
export function Spinner({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      className={`size-4 shrink-0 animate-spin motion-reduce:animate-none ${className}`}
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function CheckIcon({ className = '' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className={`size-4 shrink-0 ${className}`}>
      <path
        d="M3.5 8.5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}