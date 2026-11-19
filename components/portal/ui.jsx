// components/portal/ui.jsx
// Shared building blocks for the client portal. Presentational only and free of
// hooks, so they work in both Server and Client Components.

import { File, FileSpreadsheet, FileText, FolderArchive, Image as ImageIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fp-portal-accent-strong'

// ── Surfaces ──────────────────────────────────────────────────────────────────

export function Card({ as: Tag = 'div', className = '', children, ...props }) {
  return (
    <Tag
      className={cn('rounded-2xl border border-fp-portal-border bg-fp-portal-surface shadow-fp-card', className)}
      {...props}
    >
      {children}
    </Tag>
  )
}

export function CardHeader({ icon: Icon, title, titleId, count, badge, description, aside }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-fp-portal-border px-5 py-3.5 sm:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-fp-portal-text-muted" aria-hidden="true" />}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 id={titleId} className="text-sm font-semibold leading-snug text-fp-portal-text-primary">
              {title}
            </h2>
            {badge ?? (count != null && <Badge tone="neutral">{count}</Badge>)}
          </div>
          {description && <p className="mt-0.5 text-xs text-fp-portal-text-muted">{description}</p>}
        </div>
      </div>
      {aside}
    </div>
  )
}

// Small label-over-value pair for fact rows (overview hero).
export function Fact({ label, className = '', children }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-[11px] font-medium uppercase tracking-widest text-fp-portal-text-muted">{label}</p>
      <div className="mt-1.5 text-sm font-semibold text-fp-portal-text-primary">{children}</div>
    </div>
  )
}

export function CardBody({ className = '', children }) {
  return <div className={`p-5 sm:p-6 ${className}`}>{children}</div>
}

// ── Small elements ────────────────────────────────────────────────────────────

const TILE_TONES = {
  accent:  'bg-fp-portal-accent/10 text-fp-portal-accent-strong',
  success: 'bg-fp-portal-success/10 text-fp-portal-success',
  danger:  'bg-fp-portal-danger/10 text-fp-portal-danger',
  neutral: 'bg-fp-portal-raised text-fp-portal-text-secondary',
}

// Pass an `icon` component, or `children` when the icon depends on data.
export function IconTile({ icon: Icon, tone = 'accent', className = '', children }) {
  return (
    <span
      aria-hidden="true"
      className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', TILE_TONES[tone], className)}
    >
      {children ?? <Icon className="h-[18px] w-[18px]" />}
    </span>
  )
}

// Icon for a file's MIME type. A component (not a lookup) so it can be used
// inside lists without creating components during render.
export function FileTypeIcon({ fileType, className }) {
  const mime = (fileType || '').toLowerCase()
  if (mime.startsWith('image/')) return <ImageIcon className={className} />
  if (mime.includes('spreadsheet') || mime.includes('excel')) return <FileSpreadsheet className={className} />
  if (mime === 'application/pdf' || mime.includes('word') || mime.includes('document')) {
    return <FileText className={className} />
  }
  if (mime.includes('zip') || mime.includes('compressed')) return <FolderArchive className={className} />
  return <File className={className} />
}

const BADGE_TONES = {
  accent:  'bg-fp-portal-accent/10 text-fp-portal-accent-strong',
  success: 'bg-fp-portal-success/8 text-fp-portal-success',
  danger:  'bg-fp-portal-danger/10 text-fp-portal-danger',
  neutral: 'bg-fp-portal-raised text-fp-portal-text-secondary',
}

export function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-none',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Eyebrow({ as: Tag = 'p', className = '', children, ...props }) {
  return (
    <Tag
      className={cn('text-xs font-semibold uppercase tracking-widest text-fp-portal-text-muted', className)}
      {...props}
    >
      {children}
    </Tag>
  )
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-fp-portal-border px-6 py-10 text-center">
      {Icon && <Icon className="h-6 w-6 text-fp-portal-text-muted" aria-hidden="true" />}
      <p className="text-sm font-medium text-fp-portal-text-secondary">{title}</p>
      {description && <p className="max-w-xs text-xs leading-relaxed text-fp-portal-text-muted">{description}</p>}
    </div>
  )
}

// ── Buttons ───────────────────────────────────────────────────────────────────

const BUTTON_BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold ' +
  'transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10'

const BUTTON_VARIANTS = {
  primary:   'bg-fp-portal-accent-strong text-white hover:bg-fp-portal-accent-strong/90',
  success:   'bg-fp-portal-success text-white hover:bg-fp-portal-success/90',
  danger:    'bg-fp-portal-danger text-white hover:bg-fp-portal-danger/90',
  secondary: 'border border-fp-portal-border bg-fp-portal-surface text-fp-portal-text-primary hover:bg-fp-portal-raised',
  ghost:     'text-fp-portal-text-secondary hover:bg-fp-portal-raised hover:text-fp-portal-text-primary',
}

// Renders an <a> when `href` is given, otherwise a <button>.
// `loading` swaps the icon for a spinner and disables the button.
export function Button({
  variant = 'secondary',
  icon: Icon,
  loading = false,
  disabled = false,
  href,
  className = '',
  children,
  ...props
}) {
  const classes = cn(BUTTON_BASE, BUTTON_VARIANTS[variant], focusRing, className)
  const content = (
    <>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        Icon && <Icon className="h-4 w-4" aria-hidden="true" />
      )}
      {children}
    </>
  )

  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {content}
      </a>
    )
  }

  return (
    <button
      type="button"
      className={classes}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </button>
  )
}

// ── Form controls ─────────────────────────────────────────────────────────────

export const controlClass =
  'w-full rounded-xl border border-fp-portal-border-control bg-fp-portal-surface px-3.5 py-2.5 text-sm ' +
  'text-fp-portal-text-primary placeholder:text-fp-portal-text-muted resize-none transition-colors duration-150 ' +
  'focus-visible:border-fp-portal-accent-strong focus-visible:outline-2 focus-visible:outline-fp-portal-accent-strong/25 ' +
  'disabled:opacity-60'

export function FieldLabel({ htmlFor, children, className = '' }) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('mb-2 block text-xs font-semibold uppercase tracking-widest text-fp-portal-text-muted', className)}
    >
      {children}
    </label>
  )
}
