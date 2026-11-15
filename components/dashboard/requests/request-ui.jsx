// components/dashboard/requests/request-ui.jsx
// Small building blocks shared by the client-request components.
// Styling uses the dashboard fp-* tokens only.

import { CheckCircle2, Clock, Loader2, MessageSquare, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export const fieldClass = `
  w-full rounded-lg border border-fp-border bg-fp-raised px-3 py-2 text-sm
  text-fp-text-primary placeholder:text-fp-text-tertiary [color-scheme:dark]
  transition-colors duration-150 focus:border-fp-accent/50 focus:outline-none
  focus:ring-2 focus:ring-fp-accent/20 disabled:opacity-50
  aria-[invalid=true]:border-fp-danger/60
`

// The closed state of the shadcn Select / date picker, styled like fieldClass.
// fp-dark-popover gives the shadcn semantic tokens their dark values here.
export const pickerTriggerClass = `
  fp-dark-popover h-auto w-full justify-between gap-2 rounded-lg border border-fp-border
  bg-fp-raised px-3 py-2 text-left text-sm font-normal text-fp-text-primary shadow-none
  transition-colors duration-150 hover:border-fp-accent/30
  focus-visible:border-fp-accent/50 focus-visible:ring-2 focus-visible:ring-fp-accent/20
  data-[state=open]:border-fp-accent/50 data-[state=open]:ring-2 data-[state=open]:ring-fp-accent/20
  disabled:opacity-50
`

// The floating panel (select list, calendar).
export const pickerPopoverClass = 'fp-dark-popover border-fp-border shadow-xl shadow-black/40'

// Slim scrollbar in the app's colours. Same recipe as RecentActivityPanel:
// Chrome ignores ::-webkit-scrollbar if scrollbar-width is set, so the
// standard properties apply only where ::-webkit-scrollbar is unsupported.
export const thinScrollbar =
  '[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:my-1 [&::-webkit-scrollbar-track]:bg-transparent ' +
  '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-fp-text-tertiary/40 ' +
  '[&::-webkit-scrollbar-thumb:hover]:bg-fp-text-tertiary/80 ' +
  'supports-[not_selector(::-webkit-scrollbar)]:[scrollbar-width:thin] ' +
  'supports-[not_selector(::-webkit-scrollbar)]:[scrollbar-color:var(--color-fp-text-tertiary)_transparent]'

export const labelClass =
  'mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-fp-text-secondary'

const BUTTON_BASE = `
  inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg
  px-3 text-xs font-medium transition-colors duration-150
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-accent/40
  disabled:cursor-not-allowed disabled:opacity-50
`

const BUTTON_VARIANTS = {
  primary: 'bg-fp-accent font-semibold text-fp-base hover:bg-fp-accent-hover',
  secondary: 'border border-fp-border text-fp-text-primary hover:bg-fp-raised',
  ghost: 'text-fp-text-secondary hover:bg-fp-raised hover:text-fp-text-primary',
  danger: 'text-fp-danger hover:bg-fp-danger/10',
  dangerSolid: 'bg-fp-danger font-semibold text-white hover:bg-fp-danger/90',
}

// `icon` is swapped for a spinner while `loading`, so a busy button never
// shows two icons.
export function ActionButton({
  variant = 'secondary',
  icon: Icon,
  loading = false,
  disabled,
  className,
  children,
  ...props
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], className)}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {children}
    </button>
  )
}

// Status is always an icon AND a word, never colour alone.
const STATUS = {
  OPEN: { label: 'Waiting on client', Icon: Clock, tone: 'text-fp-text-secondary' },
  SUBMITTED: { label: 'Needs review', Icon: MessageSquare, tone: 'text-fp-warning' },
  ACCEPTED: { label: 'Accepted', Icon: CheckCircle2, tone: 'text-fp-success' },
  CANCELLED: { label: 'Cancelled', Icon: XCircle, tone: 'text-fp-text-secondary' },
}

export function StatusBadge({ status }) {
  const meta = STATUS[status]
  if (!meta) return null
  const { label, Icon, tone } = meta
  return (
    <span className={cn('inline-flex items-center gap-1 font-semibold', tone)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  )
}