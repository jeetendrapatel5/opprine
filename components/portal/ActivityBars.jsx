// components/portal/ActivityBars.jsx
// Tiny per-day activity chart: one bar per day, oldest to newest. Built from
// real update timestamps (see getActivityBuckets), so it shows the pace of work
// rather than decorating the page. Presentational only.

import { cn } from '@/lib/utils'

export default function ActivityBars({ counts, total, label = 'Activity in the last 14 days' }) {
  const max = Math.max(...counts, 1)

  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <div
        role="img"
        aria-label={`${label}: ${total} ${total === 1 ? 'update' : 'updates'}`}
        className="flex h-6 items-end gap-[3px]"
      >
        {counts.map((count, i) => (
          <span
            key={i}
            style={{ height: `${count ? 25 + (count / max) * 75 : 12}%` }}
            className={cn('w-[3px] rounded-full', count ? 'bg-fp-portal-accent' : 'bg-fp-portal-border')}
          />
        ))}
      </div>
      <span aria-hidden="true" className="text-[11px] font-medium tabular-nums text-fp-portal-text-muted">
        14d
      </span>
    </div>
  )
}
