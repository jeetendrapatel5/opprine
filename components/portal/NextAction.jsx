// components/portal/NextAction.jsx
// The overview's focal card: the single most urgent thing waiting on the client,
// with one primary button. With nothing pending it becomes a calm "all caught
// up" note. `item` is built on the server (PortalView) from real data and sorted
// by urgency; this component only presents it and navigates.
//
// The card is usually stretched to the height of the hero beside it, so it is
// built for spare height: the header stays at the top, and the statement and the
// button stay together at the bottom. Extra room becomes calm space under the
// header instead of a hole between the text and the button.
'use client'

import { ArrowRight, BadgeCheck, Check, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge, Button, Card, Eyebrow } from './ui'
import { ICONS, usePortalView } from './PortalShell'

const META_TONE = { overdue: 'danger', soon: 'accent', later: 'neutral' }
const MAX_QUEUE_SEGMENTS = 5

// Ring + dot: the same "waiting on you" marker the update feed uses for "In review".
// Red only when the item is overdue.
function Beacon({ tone }) {
  const danger = tone === 'danger'
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 bg-fp-portal-surface',
        danger ? 'border-fp-portal-danger' : 'border-fp-portal-accent',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', danger ? 'bg-fp-portal-danger' : 'bg-fp-portal-accent')} />
    </span>
  )
}

// Same size as the feed's "done" marker: the check that says nothing is waiting.
function ClearMark() {
  return (
    <span
      aria-hidden="true"
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-fp-portal-success text-white"
    >
      <Check className="h-3 w-3" strokeWidth={3} />
    </span>
  )
}

function CardHeading({ marker, aside }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {marker}
        <Eyebrow className="text-[11px]">Next up</Eyebrow>
      </div>
      {aside}
    </div>
  )
}

// "1 of N" at a glance: the first segment is this item, the rest are queued behind it.
// Decorative: the sentence above the button says the same thing in words.
function QueueBars({ total, tone }) {
  const segments = Math.min(total, MAX_QUEUE_SEGMENTS)
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center gap-1">
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-1 w-4 rounded-full',
            i > 0 ? 'bg-fp-portal-border' : tone === 'danger' ? 'bg-fp-portal-danger' : 'bg-fp-portal-accent',
          )}
        />
      ))}
    </span>
  )
}

export default function NextAction({ item, fallback, moreCount = 0 }) {
  const { setView } = usePortalView()

  if (!item) {
    return (
      <Card as="section" aria-labelledby="next-title" className="flex w-full flex-col p-5 sm:p-6">
        <CardHeading marker={<ClearMark />} />
        {/* No button to anchor to, so the text is centred in the spare height instead. */}
        <div className="mt-6 lg:my-auto lg:py-6">
          <h2
            id="next-title"
            className="text-balance text-[22px] font-semibold leading-tight tracking-tight text-fp-portal-text-primary"
          >
            You&apos;re all caught up
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-fp-portal-text-secondary">{fallback}</p>
        </div>
      </Card>
    )
  }

  const go = () => {
    // Items on this same screen (legacy sign-offs) scroll to their panel instead.
    if (item.anchor) {
      const el = document.getElementById(item.anchor)
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      el?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' })
    } else {
      setView(item.view)
    }
  }

  // The icon of the sidebar item this button leads to, so the card and the menu match.
  const TypeIcon = item.anchor ? BadgeCheck : ICONS[item.view]

  // Only invoices carry `tone: 'danger'`, but a request or milestone can be overdue too
  // (its badge turns red), so the beacon and queue follow the badge as well.
  const tone = item.tone === 'danger' || item.meta?.state === 'overdue' ? 'danger' : item.tone

  return (
    <Card as="section" aria-labelledby="next-title" className="flex w-full flex-col p-5 sm:p-6">
      <CardHeading
        marker={<Beacon tone={tone} />}
        aside={moreCount > 0 ? <QueueBars total={moreCount + 1} tone={tone} /> : undefined}
      />

      <div className="mt-6 lg:mt-auto lg:pt-6">
        <h2
          id="next-title"
          className="text-balance text-[22px] font-semibold leading-tight tracking-tight text-fp-portal-text-primary"
        >
          {item.label}
        </h2>

        {/* The specific thing, set apart like a reference so even one word reads as intentional. */}
        {item.detail && (
          <p className="mt-3 flex items-start gap-2.5 rounded-lg bg-fp-portal-raised px-3 py-2.5 text-sm leading-snug text-fp-portal-text-secondary">
            {TypeIcon && <TypeIcon className="mt-0.5 h-4 w-4 shrink-0 text-fp-portal-text-muted" aria-hidden="true" />}
            <span className="min-w-0 break-words">{item.detail}</span>
          </p>
        )}

        {item.meta && (
          <Badge tone={META_TONE[item.meta.state] ?? 'neutral'} className="mt-3 self-start">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {item.meta.text}
          </Badge>
        )}
      </div>

      <div className="mt-6">
        {moreCount > 0 && (
          <p className="mb-3 text-xs text-fp-portal-text-muted">
            <span className="font-semibold tabular-nums text-fp-portal-text-secondary">+{moreCount}</span> more{' '}
            {moreCount === 1 ? 'thing' : 'things'} waiting on you below
          </p>
        )}
        {/* Arrow after the label: it points where the click goes, and nudges on hover. */}
        <Button variant="primary" onClick={go} className="group w-full sm:w-auto lg:w-full">
          {item.cta}
          <ArrowRight
            className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Button>
      </div>
    </Card>
  )
}