// components/project/ProjectInfoPanel.jsx
//
// Body of the "Project info" dialog: the client and the project's key numbers.
// It replaces the old sidebar "Client" and "Project details" cards.
//
// It is rendered inside <ProjectPanelDialog bare>, so it draws its own card
// and its own visible heading. The dialog supplies a screen-reader-only title.
//
// Props (plain data from page.jsx. No permission logic here):
//   projectName  string
//   status       { label, className }  same object the page header uses
//   client       null (role may not view the client) or
//                { name, email, initial, lastSeen, lastSeenDate }
//   stats        { startedLabel, durationLabel, progress, updates, files }

import { Briefcase, Eye, EyeOff, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ClientAvatar,
  ProgressBar,
  RestrictedNotice,
  StatusDot,
} from '@/components/project/SidebarPrimitives'

const SECTION_LABEL =
  'text-[11px] font-semibold uppercase tracking-widest text-fp-text-secondary'

function InfoRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-sm text-fp-text-secondary">{label}</dt>
      <dd className="text-sm font-medium tabular-nums text-fp-text-primary">{children}</dd>
    </div>
  )
}

function ClientSection({ client }) {
  const viewed = Boolean(client.lastSeen)

  return (
    <>
      <div className="mt-3 flex items-center gap-3">
        <ClientAvatar initial={client.initial} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-fp-text-primary">{client.name}</p>
          {client.email && (
            <a
              href={`mailto:${client.email}`}
              className="flex items-center gap-1.5 rounded text-sm text-fp-text-secondary transition-colors hover:text-fp-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-accent/70"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{client.email}</span>
            </a>
          )}
        </div>
      </div>

      {/* Portal activity: green when the client has opened the portal. */}
      <div
        className={cn(
          'mt-4 flex items-center gap-3 rounded-xl border px-4 py-3',
          viewed ? 'border-fp-success/30 bg-fp-success/10' : 'border-fp-border bg-fp-raised',
        )}
      >
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            viewed ? 'bg-fp-success/15 text-fp-success' : 'bg-fp-base text-fp-text-secondary',
          )}
        >
          {viewed ? (
            <Eye className="h-4 w-4" aria-hidden="true" />
          ) : (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fp-text-primary">
            {viewed ? `Last seen ${client.lastSeen}` : 'Portal not opened yet'}
          </p>
          {viewed && client.lastSeenDate && (
            <p className="text-xs text-fp-text-secondary">{client.lastSeenDate} · Client portal</p>
          )}
        </div>

        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
            viewed ? 'bg-fp-success/15 text-fp-success' : 'bg-fp-base text-fp-text-secondary',
          )}
        >
          <StatusDot active={viewed} />
          {viewed ? 'Viewed' : 'Not viewed'}
        </span>
      </div>
    </>
  )
}

export default function ProjectInfoPanel({ projectName, status, client, stats }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-fp-border bg-fp-surface">
      {/* pr-14 keeps the title clear of the dialog's built-in close button */}
      <div className="flex items-center gap-3 border-b border-fp-border py-5 pl-6 pr-14">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fp-accent-muted text-fp-accent">
          <Briefcase className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-base font-semibold text-fp-text-primary">Project info</p>
          <p className="flex items-center gap-2 text-sm text-fp-text-secondary">
            <span className="truncate">{projectName}</span>
            <span
              className={cn(
                'shrink-0 text-[10px] font-bold uppercase tracking-widest',
                status.className,
              )}
            >
              {status.label}
            </span>
          </p>
        </div>
      </div>

      <div className="space-y-6 px-6 py-5">
        <section aria-labelledby="info-client-heading">
          <h3 id="info-client-heading" className={SECTION_LABEL}>
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

        <section aria-labelledby="info-project-heading">
          <h3 id="info-project-heading" className={SECTION_LABEL}>
            Project
          </h3>
          <dl className="mt-1 divide-y divide-fp-border">
            <InfoRow label="Started">{stats.startedLabel}</InfoRow>
            <InfoRow label="Duration">{stats.durationLabel}</InfoRow>
            <InfoRow label="Milestones">
              <span className="flex items-center gap-3">
                <ProgressBar value={stats.progress} className="w-24" />
                <span className="font-semibold text-fp-accent">{stats.progress}%</span>
              </span>
            </InfoRow>
            <InfoRow label="Updates">{stats.updates}</InfoRow>
            <InfoRow label="Files">{stats.files}</InfoRow>
          </dl>
        </section>
      </div>
    </div>
  )
}