// components/portal/AttentionCard.jsx
// "Needs you" list on the overview. One row per thing waiting on the client; the
// right-hand verb says what to do and the row jumps to the screen where it is
// done. Empty = all caught up.
'use client'

import { ArrowRight, BellRing, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardBody, CardHeader, focusRing } from './ui'
import { usePortalView } from './PortalShell'

export default function AttentionCard({ items }) {
  const { setView } = usePortalView()

  return (
    <Card as="section" aria-labelledby="attention-title" className="overflow-hidden">
      <CardHeader
        icon={items.length ? BellRing : CheckCircle2}
        titleId="attention-title"
        title="Needs you"
        count={items.length || undefined}
      />

      {items.length === 0 ? (
        <CardBody>
          <p className="text-sm text-fp-portal-text-secondary">You&apos;re all caught up. Nothing is waiting on you.</p>
        </CardBody>
      ) : (
        <ul className="divide-y divide-fp-portal-border">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setView(item.view)}
                // Inset outline: the card clips anything drawn outside its edge.
                className={cn(
                  'group flex min-h-14 w-full items-center gap-3 px-5 py-3 text-left transition-colors duration-150 hover:bg-fp-portal-raised active:bg-fp-portal-raised sm:px-6',
                  focusRing,
                  'focus-visible:outline-offset-[-2px]',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    item.tone === 'danger' ? 'bg-fp-portal-danger' : 'bg-fp-portal-accent',
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-fp-portal-text-primary sm:truncate">{item.label}</span>
                  {item.detail && (
                    <span className="mt-0.5 block truncate text-xs text-fp-portal-text-secondary">{item.detail}</span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-fp-portal-accent-strong">
                  {item.action}
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
