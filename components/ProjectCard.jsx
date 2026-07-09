import Link from 'next/link'
import { Clock, ChevronRight, Briefcase } from 'lucide-react'
import DeleteProjectButton from '@/components/DeleteProjectButton'

const statusConfig = {
  ACTIVE: {
    label: 'Active',
    dotClass: 'bg-fp-accent',
    badgeClass: 'text-fp-accent',
    avatarClass: 'border-fp-accent/15 bg-fp-accent-muted text-fp-accent',
  },
  COMPLETED: {
    label: 'Done',
    dotClass: 'bg-fp-success',
    badgeClass: 'text-fp-success',
    avatarClass: 'border-fp-success/15 bg-fp-success/10 text-fp-success',
  },
  ON_HOLD: {
    label: 'On Hold',
    dotClass: 'bg-fp-warning',
    badgeClass: 'text-fp-warning',
    avatarClass: 'border-fp-warning/15 bg-fp-warning/10 text-fp-warning',
  },
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function getInitial(name) {
  return name?.trim()?.[0]?.toUpperCase() ?? '?'
}

export default function ProjectCard({ project }) {
  const status = statusConfig[project.status] ?? statusConfig.ACTIVE
  const lastUpdate = project.updates?.[0]
  const clientName = project.client?.name
  const milestones = project.milestones ?? []
  const completedMilestones = milestones.filter((milestone) => milestone.status === 'COMPLETED').length
  const totalMilestones = milestones.length
  const progressPct = totalMilestones > 0
    ? Math.round((completedMilestones / totalMilestones) * 100)
    : null
  const isRecentUpdate = lastUpdate
    ? (new Date() - new Date(lastUpdate.createdAt)) < 86_400_000
    : false

  return (
    <Link
      href={`/dashboard/projects/${project.id}`}
      className="group relative block overflow-hidden rounded-lg border border-fp-border bg-fp-surface/95 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-accent/40 active:scale-[0.985] hover:border-fp-accent/35 sm:hover:bg-fp-surface"
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 sm:group-hover:opacity-100" />

      <div className="relative p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${status.badgeClass}`}>
                {status.label}
              </span>

              {isRecentUpdate && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-fp-border bg-fp-base/60 px-2.5 py-1 text-[10px] font-medium text-fp-text-secondary">
                  <span className="h-1.5 w-1.5 rounded-full bg-fp-success" />
                  Updated today
                </span>
              )}
            </div>

            <h3 className="truncate text-[15px] font-semibold leading-tight text-fp-text-primary sm:text-base">
              {project.name}
            </h3>

          </div>

          <div className="flex shrink-0 items-center gap-2">
            <DeleteProjectButton projectId={project.id} projectName={project.name} />

            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-fp-border bg-fp-base/60 text-fp-text-tertiary transition-colors duration-200 sm:group-hover:border-fp-accent/30 sm:group-hover:text-fp-accent">
              <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-lg border border-fp-border/50 bg-fp-base/40 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="flex items-center gap-3 min-w-0 pb-3 sm:pb-0">
            {clientName ? (
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${status.avatarClass}`}>
                {getInitial(clientName)}
              </span>
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-fp-border bg-fp-raised text-fp-text-tertiary">
                <Briefcase className="h-4 w-4" />
              </span>
            )}

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-fp-text-tertiary">
                Client
              </p>
              <p className="truncate text-sm font-medium text-fp-text-primary">
                {clientName ?? 'No client assigned'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-6 sm:items-end sm:justify-center">
            <div className="sm:text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-fp-text-tertiary">
                Last update
              </p>
              <p className="mt-1 flex items-center justify-end gap-1.5 text-xs font-medium text-fp-text-secondary tabular-nums">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                {lastUpdate ? timeAgo(lastUpdate.createdAt) : 'No updates yet'}
              </p>
            </div>

            <div className="text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-fp-text-tertiary">
                Milestones
              </p>
              <p className="mt-1 text-xs font-medium text-fp-text-secondary tabular-nums">
                {totalMilestones > 0 ? `${completedMilestones}/${totalMilestones} Complete` : 'No milestones yet'}
              </p>
            </div>
          </div>
        </div>

        {progressPct !== null && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-fp-text-tertiary">
                Completion
              </span>
              <span className="text-xs font-semibold text-fp-text-secondary tabular-nums">
                {progressPct}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-fp-border/70">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-out ${status.dotClass}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}
