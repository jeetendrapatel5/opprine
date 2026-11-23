// components/portal/MetricStrip.jsx
// Four numbers a client checks first, in one ledger-style strip. Each cell
// opens the screen where that number is explained. Hairlines come from a 1px
// grid gap over the border colour, so the strip needs an even cell count.
'use client'

import { cn } from '@/lib/utils'
import { focusRing } from './ui'
import { usePortalView } from './PortalShell'

const VALUE_TONE = { danger: 'text-fp-portal-danger', accent: 'text-fp-portal-accent-strong' }

export default function MetricStrip({ items }) {
  const { setView } = usePortalView()

  return (
    <section
      aria-label="Key figures"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-fp-portal-border bg-fp-portal-border shadow-fp-card lg:grid-cols-4"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setView(item.view)}
          // Inset outline: the strip clips anything drawn outside its edge.
          className={cn(
            'min-w-0 bg-fp-portal-surface px-5 py-4 text-left transition-colors duration-150 hover:bg-fp-portal-raised active:bg-fp-portal-raised sm:px-6',
            focusRing,
            'focus-visible:outline-offset-[-2px]',
          )}
        >
          <span className="block text-[11px] font-medium uppercase tracking-widest text-fp-portal-text-muted">
            {item.label}
          </span>
          <span
            title={item.value}
            className={cn(
              'mt-2 block truncate text-xl font-semibold leading-none tracking-tight tabular-nums text-fp-portal-text-primary',
              VALUE_TONE[item.tone],
            )}
          >
            {item.value}
          </span>
          <span
            className={cn(
              'mt-1.5 block truncate text-xs',
              item.hintTone === 'danger' ? 'font-medium text-fp-portal-danger' : 'text-fp-portal-text-secondary',
            )}
          >
            {item.hint}
          </span>
        </button>
      ))}
    </section>
  )
}
