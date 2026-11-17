// components/portal/ProgressBanner.jsx
// Overview hero: a progress ring with the project's status and the three facts
// a client checks first. Server Component.

import { formatDate } from '@/components/dashboard/requests/request-format'
import { PROJECT_STATUS, getLastUpdateDate, getNextDueMilestone, timeAgo } from '@/lib/portal-format'
import { Badge, Card } from './ui'

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function Ring({ percentage }) {
  const done = percentage === 100
  return (
    <div
      role="progressbar"
      aria-label="Overall project progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
      className="relative h-36 w-36 shrink-0 sm:h-40 sm:w-40"
    >
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="10" className="stroke-fp-portal-raised" />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - percentage / 100)}
          className={`motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700 ${
            done ? 'stroke-fp-portal-success' : 'stroke-fp-portal-accent'
          }`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-medium tabular-nums text-fp-portal-text-primary">
          {percentage}
          <span className="text-xl text-fp-portal-text-muted">%</span>
        </span>
        <span className="text-xs font-medium text-fp-portal-text-muted">complete</span>
      </div>
    </div>
  )
}

function Stat({ label, value, hint }) {
  return (
    <div className="min-w-0 rounded-xl bg-fp-portal-bg px-4 py-3">
      <dt className="text-xs font-medium text-fp-portal-text-muted">{label}</dt>
      <dd className="mt-1 truncate text-base font-semibold tabular-nums text-fp-portal-text-primary">{value}</dd>
      {hint && <p className="mt-0.5 truncate text-xs text-fp-portal-text-secondary">{hint}</p>}
    </div>
  )
}

export default function ProgressBanner({ progress, projectName, clientName, milestones }) {
  const { completed, total, percentage, projectStatus } = progress
  const status = PROJECT_STATUS[projectStatus] ?? PROJECT_STATUS.ON_TRACK

  const nextDue = getNextDueMilestone(milestones)
  const lastUpdate = getLastUpdateDate(milestones)

  const stats = [
    { label: 'Milestones done', value: `${completed} of ${total}` },
    nextDue && { label: 'Next due', value: formatDate(nextDue.dueDate), hint: nextDue.title },
    lastUpdate && { label: 'Last update', value: timeAgo(lastUpdate) },
  ].filter(Boolean)

  return (
    <Card as="section" aria-labelledby="project-title" className="p-5 sm:p-8">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        {total > 0 && <Ring percentage={percentage} />}

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <Badge tone={status.tone}>
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
            {status.label}
          </Badge>
          <h2
            id="project-title"
            className="mt-3 font-display text-2xl font-medium leading-tight tracking-tight text-fp-portal-text-primary sm:text-3xl"
          >
            {projectName}
          </h2>
          <p className="mt-1 text-sm text-fp-portal-text-secondary">Prepared for {clientName}</p>

          {total === 0 ? (
            <p className="mt-4 text-sm text-fp-portal-text-secondary">
              The project plan is being set up. Milestones will appear here soon.
            </p>
          ) : (
            <dl className="mt-5 grid grid-cols-2 gap-3 text-left sm:grid-cols-3">
              {stats.map((stat) => (
                <Stat key={stat.label} {...stat} />
              ))}
            </dl>
          )}
        </div>
      </div>
    </Card>
  )
}
