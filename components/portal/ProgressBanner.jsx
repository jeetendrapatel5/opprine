// components/portal/ProgressBanner.jsx
// Overview hero: how far along the project is. One rail segment per milestone,
// so the client sees *which* parts are done, and each segment carries its due
// date: overdue ones turn red, the rest show how far away they are. The key
// figures (money, deadline, requests) live in MetricStrip, so this card stays
// about progress. `current` and `team` are optional slots for existing components.
// Server Component.

import { formatDate } from '@/components/dashboard/requests/request-format'
import { PROJECT_STATUS, dueLabel } from '@/lib/portal-format'
import { cn } from '@/lib/utils'
import { Badge, Card } from './ui'

// Segment look per milestone status. In progress is half filled, awaiting review
// is full blue, so the client can tell "being built" from "waiting on me".
const SEGMENT = {
  COMPLETED:   { fill: 'bg-fp-portal-text-primary', text: 'text-fp-portal-text-secondary', label: 'Complete' },
  IN_PROGRESS: {
    fill: 'bg-[linear-gradient(90deg,var(--color-fp-portal-accent)_50%,var(--color-fp-portal-raised)_50%)]',
    text: 'font-semibold text-fp-portal-text-primary',
    label: 'In progress',
  },
  IN_REVIEW:   { fill: 'bg-fp-portal-accent', text: 'font-semibold text-fp-portal-text-primary', label: 'Awaiting your review' },
  PENDING:     { fill: 'bg-fp-portal-raised', text: 'text-fp-portal-text-muted', label: 'Upcoming' },
}

const DUE_TONE = { overdue: 'font-medium text-fp-portal-danger', soon: 'text-fp-portal-accent-strong', later: 'text-fp-portal-text-muted' }

// Second label line: when it was approved, or how far away the due date is.
function segmentNote(m) {
  if (m.status === 'COMPLETED') return m.completedAt ? { text: formatDate(m.completedAt), tone: 'text-fp-portal-text-muted' } : null
  const due = dueLabel(m.dueDate)
  return due ? { text: due.text, tone: DUE_TONE[due.state], overdue: due.state === 'overdue' } : null
}

function Rail({ milestones, allDone }) {
  return (
    <ol aria-label="Milestones" className="mt-5 grid grid-flow-col auto-cols-fr gap-1.5">
      {milestones.map((m, i) => {
        const seg = SEGMENT[m.status] ?? SEGMENT.PENDING
        const note = segmentNote(m)
        // Overdue work shows red, except awaiting-review: that ball is in the client's court.
        const overdue = note?.overdue && m.status !== 'IN_REVIEW'
        return (
          <li key={m.id} className="min-w-0">
            <div
              aria-hidden="true"
              style={{ '--i': i }}
              className={cn(
                'fp-rail-seg h-2 rounded-full',
                allDone ? 'bg-fp-portal-success' : overdue ? 'bg-fp-portal-danger' : seg.fill,
                m.status === 'PENDING' && !overdue && 'shadow-[inset_0_0_0_1px_var(--color-fp-portal-border)]',
              )}
            />
            <p className={cn('mt-2 hidden truncate text-xs sm:block', seg.text)}>{m.title}</p>
            <p className={cn('mt-0.5 hidden min-h-4 truncate text-[11px] tabular-nums sm:block', note?.tone)}>
              {note?.text}
            </p>
            <span className="sr-only">
              {m.title}: {seg.label}
              {note ? `, ${note.text}` : ''}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export default function ProgressBanner({ progress, projectName, clientName, milestones, current, team }) {
  const { completed, total, percentage, projectStatus } = progress
  const status = PROJECT_STATUS[projectStatus] ?? PROJECT_STATUS.ON_TRACK

  return (
    <Card as="section" aria-labelledby="project-title" className="w-full p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <Badge tone={status.tone}>
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
          {status.label}
        </Badge>
        <p className="hidden truncate text-xs text-fp-portal-text-muted sm:block">Prepared for {clientName}</p>
      </div>

      <h2 id="project-title" className="mt-3 text-lg font-semibold leading-snug tracking-tight text-fp-portal-text-primary">
        {projectName}
      </h2>

      {total === 0 ? (
        <p className="mt-4 text-sm text-fp-portal-text-secondary">
          The project plan is being set up. Milestones will appear here soon.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <div
              role="progressbar"
              aria-label="Overall project progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percentage}
              className="font-display text-6xl font-medium leading-none tracking-tighter tabular-nums text-fp-portal-text-primary"
            >
              {percentage}
              <span className="ml-0.5 text-3xl tracking-normal text-fp-portal-text-muted">%</span>
            </div>
            <p className="text-sm text-fp-portal-text-secondary">
              <span className="font-semibold tabular-nums text-fp-portal-text-primary">{completed}</span> of{' '}
              <span className="tabular-nums">{total}</span> milestones complete
            </p>
          </div>

          <Rail milestones={milestones} allDone={percentage === 100} />
        </>
      )}

      {(current || team) && (
        <div className="mt-5 grid grid-cols-2 items-start gap-x-6 gap-y-4 border-t border-fp-portal-border pt-4 sm:flex sm:flex-wrap sm:gap-x-10">
          {current}
          {team}
        </div>
      )}
    </Card>
  )
}
