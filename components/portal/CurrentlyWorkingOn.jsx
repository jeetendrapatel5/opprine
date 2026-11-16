// components/portal/CurrentlyWorkingOn.jsx
// "What is being built right now". Rendered only while a milestone is in progress.

import { CalendarClock } from 'lucide-react'
import { formatDate } from '@/components/dashboard/requests/request-format'
import { Badge, Card, Eyebrow } from './ui'

export default function CurrentlyWorkingOn({ milestone }) {
  if (!milestone) return null

  return (
    <Card className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4 sm:p-5">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fp-portal-accent/10"
      >
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-fp-portal-accent opacity-40 motion-safe:animate-ping" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-fp-portal-accent" />
        </span>
      </span>

      <div className="min-w-0 flex-1 basis-48">
        <Eyebrow>Currently working on</Eyebrow>
        <p className="mt-0.5 truncate text-base font-semibold text-fp-portal-text-primary">{milestone.title}</p>
      </div>

      {milestone.dueDate && (
        <Badge tone="neutral" className="py-1.5">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          Target {formatDate(milestone.dueDate)}
        </Badge>
      )}
    </Card>
  )
}
