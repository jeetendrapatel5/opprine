// components/project/ProjectInfoPanel.jsx
//
// Body of the "Project info" dialog: the project's progress, its key numbers,
// and the client.
//
// It is rendered inside <ProjectPanelDialog bare>, so it draws its own card.
// The dialog supplies a screen-reader-only title, so the project name below is
// the visible heading (no separate "Project info" label is needed).
//
// Layout, top to bottom (flat bands, hierarchy from type size, not boxes):
//   1. Header    project name + status
//   2. Progress  one big percentage + a full-width bar
//   3. Details   Started / Duration / Updates / Files in a 2x2 grid
//   4. Client    inset band at the bottom: who they are + portal activity
//
// Colour rules (kept strict on purpose):
//   - fp-accent is used only for things that move or can be clicked:
//     the progress fill, the client avatar and the email link.
//   - green is used only for "the client has opened the portal".
//   - everything else is text-primary / text-secondary.
//
// Props (plain data from page.jsx. No permission logic here):
//   projectName  string
//   status       { label, className }  same object the page header uses.
//                className must only set a text colour (e.g. "text-fp-success").
//   client       null (role may not view the client) or
//                { name, email, initial, lastSeen, lastSeenDate }
//   stats        { startedLabel, durationLabel, progress, updates, files }

import { cn } from '@/lib/utils'
import {
  ClientAvatar,
  ProgressBar,
  RestrictedNotice,
  StatusDot,
} from '@/components/project/SidebarPrimitives'

// Keep progress between 0 and 100 so a bad value can never break the bar or the label.
function clampPercent(value) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0
}

// One cell of the details grid: small label on top, bigger value below.
// A missing value shows an em dash, but a real 0 (for example 0 files) is kept.
function Stat({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-fp-text-secondary">{label}</dt>
      <dd className="mt-1 truncate text-lg font-semibold tracking-tight tabular-nums text-fp-text-primary">
        {children ?? '—'}
      </dd>
    </div>
  )
}

// Client block. Only rendered when `client` is not null.
function ClientSection({ client }) {
  const viewed = Boolean(client.lastSeen)

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-3">
        <ClientAvatar initial={client.initial} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-fp-text-primary">{client.name}</p>
          {client.email && (
            // The email is the one clickable thing here, so it gets the accent colour.
            <a
              href={`mailto:${client.email}`}
              className="block truncate rounded text-sm text-fp-accent transition-colors hover:text-fp-accent-hover hover:underline hover:underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-accent/70"
            >
              {client.email}
            </a>
          )}
        </div>
      </div>

      {/* Portal activity: one quiet line. The dot is green only if the client has opened the portal. */}
      <div className="flex items-center gap-2.5 text-sm">
        <StatusDot active={viewed} />
        <p className={viewed ? 'text-fp-text-primary' : 'text-fp-text-secondary'}>
          {viewed ? `Last seen ${client.lastSeen}` : 'Hasn’t opened the portal yet'}
        </p>
        {viewed && client.lastSeenDate && (
          <p className="ml-auto shrink-0 tabular-nums text-fp-text-secondary">
            {client.lastSeenDate}
          </p>
        )}
      </div>
    </div>
  )
}

export default function ProjectInfoPanel({ projectName, status, client, stats }) {
  const progress = clampPercent(stats.progress)

  return (
    <div className="overflow-hidden rounded-2xl border border-fp-border bg-fp-surface">
      {/* 1. Header. pr-14 keeps the title clear of the dialog's built-in close button. */}
      <header className="pb-5 pl-6 pr-14 pt-6">
        {/* line-clamp-2: a long project name wraps to two lines instead of being cut to one */}
        <p className="line-clamp-2 break-words text-balance text-xl font-semibold tracking-tight text-fp-text-primary">
          {projectName}
        </p>
        <p
          className={cn(
            'mt-2 inline-flex items-center gap-1.5 text-sm font-medium',
            status.className,
          )}
        >
          {/* bg-current = the dot automatically uses the same colour as the status text */}
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
          {status.label}
        </p>
      </header>

      {/* 2. Progress: the single biggest thing in the panel. */}
      <section aria-label="Milestone progress" className="px-6 pb-6">
        <div className="flex items-end justify-between gap-4">
          <p className="text-5xl font-semibold leading-none tracking-tight tabular-nums text-fp-text-primary">
            {progress}
            <span className="ml-0.5 text-2xl font-medium text-fp-text-secondary">%</span>
          </p>
          <p className="pb-0.5 text-sm text-fp-text-secondary">of milestones complete</p>
        </div>
        {/* h-2 replaces the default h-1.5 (cn merges the two classes) */}
        <ProgressBar value={progress} className="mt-4 h-2 w-full" />
      </section>

      {/* 3. Details: 2x2 grid, no divider lines needed. */}
      <section aria-labelledby="info-details-heading" className="border-t border-fp-border px-6 py-6">
        <h3 id="info-details-heading" className="sr-only">
          Project details
        </h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
          <Stat label="Started">{stats.startedLabel}</Stat>
          <Stat label="Duration">{stats.durationLabel}</Stat>
          <Stat label="Updates">{stats.updates}</Stat>
          <Stat label="Files">{stats.files}</Stat>
        </dl>
      </section>

      {/* 4. Client: a slightly darker band, like a footer, so it reads as its own area. */}
      <section
        aria-labelledby="info-client-heading"
        className="border-t border-fp-border bg-fp-base/50 px-6 py-5"
      >
        <h3 id="info-client-heading" className="text-sm font-medium text-fp-text-secondary">
          Client
        </h3>
        {client ? (
          <ClientSection client={client} />
        ) : (
          <div className="mt-3">
            <RestrictedNotice>
              Client details are restricted for your role on this project.
            </RestrictedNotice>
          </div>
        )}
      </section>
    </div>
  )
}