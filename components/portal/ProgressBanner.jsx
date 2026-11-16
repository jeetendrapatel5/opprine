// components/portal/ProgressBanner.jsx
// The project overview at the top of the portal: name, status, overall
// progress and the three facts a client checks first. Server Component.

import { formatDate } from '@/components/dashboard/requests/request-format'
import { getLastUpdateDate, getNextDueMilestone, timeAgo } from '@/lib/portal-format'
import { Badge, Card, Eyebrow } from './ui'

const STATUS = {
  ON_TRACK:        { label: 'On track',             tone: 'success' },
  AWAITING_REVIEW: { label: 'Awaiting your review', tone: 'accent' },
  COMPLETED:       { label: 'Project complete',     tone: 'success' },
}

function Stat({ label, value, hint }) {
  return (
    <div className="min-w-0 sm:px-6 sm:first:pl-0 sm:last:pr-0">
      <dt className="text-xs font-medium text-fp-portal-text-muted">{label}</dt>
      <dd className="mt-1 text-base font-semibold tabular-nums text-fp-portal-text-primary">{value}</dd>
      {hint && <p className="mt-0.5 truncate text-xs text-fp-portal-text-secondary">{hint}</p>}
    </div>
  )
}

export default function ProgressBanner({ progress, projectName, clientName, milestones }) {
  const { completed, total, percentage, projectStatus } = progress
  const status = STATUS[projectStatus] ?? STATUS.ON_TRACK

  const nextDue = getNextDueMilestone(milestones)
  const lastUpdate = getLastUpdateDate(milestones)

  const stats = [
    { label: 'Milestones complete', value: `${completed} of ${total}` },
    nextDue && { label: 'Next due', value: formatDate(nextDue.dueDate), hint: nextDue.title },
    lastUpdate && { label: 'Last update', value: timeAgo(lastUpdate) },
  ].filter(Boolean)

  return (
    <Card as="section" id="overview" aria-labelledby="project-title" className="scroll-mt-28 p-5 sm:p-8 md:scroll-mt-20">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <Eyebrow>Prepared for {clientName}</Eyebrow>
          <h1
            id="project-title"
            className="mt-2 font-display text-3xl font-medium leading-tight tracking-tight text-fp-portal-text-primary sm:text-4xl"
          >
            {projectName}
          </h1>
        </div>
        <Badge tone={status.tone} className="mt-1">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
          {status.label}
        </Badge>
      </div>

      {total === 0 ? (
        <p className="mt-6 text-sm text-fp-portal-text-secondary">
          The project plan is being set up. Milestones will appear here soon.
        </p>
      ) : (
        <>
          <div className="mt-7">
            <div className="mb-2.5 flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-fp-portal-text-secondary">Overall progress</span>
              <span className="font-display text-2xl font-medium tabular-nums text-fp-portal-text-primary">
                {percentage}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Overall project progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percentage}
              className="h-2.5 w-full overflow-hidden rounded-full bg-fp-portal-raised"
            >
              <div
                className={`h-full rounded-full motion-safe:transition-[width] motion-safe:duration-700 ${
                  percentage === 100 ? 'bg-fp-portal-success' : 'bg-fp-portal-accent'
                }`}
                style={{ width: `${Math.max(percentage, 3)}%` }}
              />
            </div>
          </div>

          <dl className="mt-6 grid gap-5 border-t border-fp-portal-border pt-5 sm:grid-flow-col sm:auto-cols-fr sm:gap-0 sm:divide-x sm:divide-fp-portal-border">
            {stats.map((stat) => (
              <Stat key={stat.label} {...stat} />
            ))}
          </dl>
        </>
      )}
    </Card>
  )
}
