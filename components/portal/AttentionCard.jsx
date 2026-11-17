// components/portal/AttentionCard.jsx
// "What needs you" list on the overview: one row per thing waiting on the
// client, each jumping to the screen where it is handled. Empty = all caught up.
'use client'

import { AlertCircle, CheckCircle2, ChevronRight, ClipboardList, ListChecks, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardBody, CardHeader, IconTile, focusRing } from './ui'
import { usePortalView } from './PortalShell'

// Items cross the server/client boundary, so icons are passed by name.
const ICONS = { review: ListChecks, request: ClipboardList, invoice: Receipt, alert: AlertCircle }

export default function AttentionCard({ items }) {
  const { setView } = usePortalView()

  return (
    <Card as="section" aria-labelledby="attention-title" className="overflow-hidden">
      <CardHeader
        icon={items.length ? AlertCircle : CheckCircle2}
        titleId="attention-title"
        title="Needs your attention"
        count={items.length || undefined}
      />

      {items.length === 0 ? (
        <CardBody>
          <p className="flex items-center gap-2 text-sm text-fp-portal-text-secondary">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-fp-portal-success" aria-hidden="true" />
            You&apos;re all caught up. Nothing is waiting on you.
          </p>
        </CardBody>
      ) : (
        <ul className="divide-y divide-fp-portal-border">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setView(item.view)}
                className={cn(
                  'group flex min-h-16 w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-fp-portal-raised sm:px-6',
                  focusRing,
                  'focus-visible:outline-offset-[-2px]',
                )}
              >
                <IconTile icon={ICONS[item.icon] ?? AlertCircle} tone={item.tone === 'danger' ? 'danger' : 'accent'} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-fp-portal-text-primary">{item.label}</span>
                  {item.detail && (
                    <span className="mt-0.5 block truncate text-xs text-fp-portal-text-secondary">{item.detail}</span>
                  )}
                </span>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-fp-portal-text-muted transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
