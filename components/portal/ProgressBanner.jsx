// components/portal/ProgressBanner.jsx
// Overview hero. The focal point of the portal: how far along the project is,
// shown as one rail segment per milestone so the client sees *which* parts are
// done, not just a percentage. Facts sit beneath on hairlines, not in boxes.
// `now` and `team` are optional slots so the page can reuse existing components.
// Server Component.

import { formatDate } from '@/components/dashboard/requests/request-format'
import { PROJECT_STATUS, getLastUpdateDate, getNextDueMilestone, timeAgo } from '@/lib/portal-format'
import { cn } from '@/lib/utils'
import { Badge, Card, Fact } from './ui'

// Segment look per milestone status. In progress is half filled, awaiting review
// is full amber, so the client can tell "being built" from "waiting on me".
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

function Rail({ milestones, allDone }) {
  return (
    <ol aria-label="Milestones" className="mt-5 grid grid-flow-col auto-cols-fr gap-1.5">
      {milestones.map((m, i) => {
        const seg = SEGMENT[m.status] ?? SEGMENT.PENDING
        return (
          <li key={m.id} className="min-w-0">
            <div
              aria-hidden="true"
              style={{ '--i': i }}
              className={cn(
                'fp-rail-seg h-2 rounded-full',
                allDone ? 'bg-fp-portal-success' : seg.fill,
                m.status === 'PENDING' && 'shadow-[inset_0_0_0_1px_var(--color-fp-portal-border)]',
              )}
            />
            <p className={cn('mt-2 hidden truncate text-xs sm:block', seg.text)}>{m.title}</p>
            <span className="sr-only">
              {m.title}: {seg.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export default function ProgressBanner({ progress, projectName, clientName, milestones, now, team }) {
  const { completed, total, percentage, projectStatus, currentMilestone } = progress
  const status = PROJECT_STATUS[projectStatus] ?? PROJECT_STATUS.ON_TRACK

  const nextDue = getNextDueMilestone(milestones)
  const lastUpdate = getLastUpdateDate(milestones)
  // Skip the milestone name under "Next due" when "Now" already shows it.
  const showNextHint = nextDue && !(now && currentMilestone && nextDue.id === currentMilestone.id)
  const hasFacts = now || nextDue || lastUpdate || team

  return (
    <Card as="section" aria-labelledby="project-title" className="p-5 sm:p-6">
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

      {hasFacts && (
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-fp-portal-border pt-5 sm:grid-flow-col sm:auto-cols-fr sm:[&>*+*]:border-l sm:[&>*+*]:border-fp-portal-border sm:[&>*+*]:pl-6">
          {now}
          {nextDue && (
            <Fact label="Next due">
              <span className="tabular-nums">{formatDate(nextDue.dueDate)}</span>
              {showNextHint && (
                <span className="mt-0.5 block truncate text-xs font-normal text-fp-portal-text-secondary">
                  {nextDue.title}
                </span>
              )}
            </Fact>
          )}
          {lastUpdate && <Fact label="Last update">{timeAgo(lastUpdate)}</Fact>}
          {team && <Fact label="Team">{team}</Fact>}
        </div>
      )}
    </Card>
  )
}
