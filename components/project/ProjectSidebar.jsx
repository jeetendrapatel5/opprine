// components/project/ProjectSidebar.jsx
//
// The right-hand column of the project page. It only DISPLAYS what the page
// gives it. The page decides what each role may see (via can()), so no
// permission logic lives here.
//
//   <ProjectSidebar summary panels panelMeta story>
//     <ClientReviewCard />   <- children render at the bottom
//   </ProjectSidebar>
//
// Props
//   summary   { progress: number, client: null | { name, initial, lastSeen } }
//             client === null means "this role may not see client details".
//   panels    The panels this viewer may open, already filtered by the page
//             (lib/project-panels.js -> visibleProjectPanels).
//   panelMeta Optional small value per panel id, e.g. { activity: { text: '14' } }.
//             Shape: { text: string, dot?: boolean }.
//   story     null (hide the row) or { href, enabled }.

import Link from 'next/link'
import { ArrowRight, BookOpen, Briefcase, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import PanelTrigger from '@/components/project/PanelTrigger'
import {
  ClientAvatar,
  ProgressBar,
  RestrictedNotice,
  StatusDot,
} from '@/components/project/SidebarPrimitives'

// Class strings used more than once live here so every card and row
// looks and behaves the same.
const CARD = 'rounded-xl border border-fp-border bg-fp-surface'

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-accent/70'

// Rows sit inside an overflow-hidden list, so the focus ring is drawn INSIDE
// the row (ring-inset). A normal ring would be clipped by the rounded corners.
const ROW =
  'group flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left transition-colors ' +
  'hover:bg-fp-raised motion-reduce:transition-none ' +
  FOCUS_RING +
  ' focus-visible:ring-inset'

// ─── Summary card: opens the Project info dialog ────────────────────────────

function ProjectSummaryCard({ progress, client }) {
  return (
    <PanelTrigger
      panelId="info"
      className={cn(
        CARD,
        'group block w-full p-4 text-left transition-colors hover:border-fp-accent/30 motion-reduce:transition-none',
        FOCUS_RING,
      )}
    >
      <span className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-fp-accent-muted text-fp-accent">
          <Briefcase className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-fp-text-primary">Project info</span>
          <span className="block text-xs text-fp-text-secondary">View all details</span>
        </span>
        <ArrowRight
          className="h-4 w-4 shrink-0 text-fp-text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-fp-accent motion-reduce:transition-none"
          aria-hidden="true"
        />
      </span>

      <span className="mt-4 block">
        <span className="mb-2 flex items-center justify-between text-xs">
          <span className="text-fp-text-secondary">Milestones</span>
          <span className="font-semibold tabular-nums text-fp-accent">{progress}%</span>
        </span>
        <ProgressBar value={progress} />
      </span>

      <span className="mt-4 flex items-center justify-between gap-3">
        {client ? (
          <>
            <span className="flex min-w-0 items-center gap-2">
              <ClientAvatar initial={client.initial} />
              <span className="truncate text-sm font-medium text-fp-text-primary">
                {client.name}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 text-xs text-fp-text-secondary">
              <StatusDot active={Boolean(client.lastSeen)} />
              {client.lastSeen ? `Seen ${client.lastSeen}` : 'Not opened yet'}
            </span>
          </>
        ) : (
          <RestrictedNotice>Client details are restricted for your role.</RestrictedNotice>
        )}
      </span>
    </PanelTrigger>
  )
}

// ─── One row of the "Manage project" list ───────────────────────────────────

function RowBody({ icon: Icon, label, meta }) {
  return (
    <>
      <Icon
        className="h-4 w-4 shrink-0 text-fp-text-secondary transition-colors group-hover:text-fp-accent motion-reduce:transition-none"
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-fp-text-primary">
        {label}
      </span>
      {meta && (
        <span className="flex shrink-0 items-center gap-1.5 text-xs tabular-nums text-fp-text-secondary">
          {meta.dot && <StatusDot active />}
          {meta.text}
        </span>
      )}
      <ChevronRight
        className="h-4 w-4 shrink-0 text-fp-text-tertiary transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        aria-hidden="true"
      />
    </>
  )
}

// ─── The sidebar ────────────────────────────────────────────────────────────

export default function ProjectSidebar({ summary, panels, panelMeta = {}, story, children }) {
  return (
    <div className="space-y-5">
      <ProjectSummaryCard progress={summary.progress} client={summary.client} />

      <section aria-labelledby="manage-project-heading">
        <h2
          id="manage-project-heading"
          className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-fp-text-secondary"
        >
          Manage project
        </h2>

        <ul className={cn(CARD, 'divide-y divide-fp-border overflow-hidden')}>
          {/* Story is a page (a link). The panels below open dialogs (buttons). */}
          {story && (
            <li>
              <Link href={story.href} className={ROW}>
                <RowBody
                  icon={BookOpen}
                  label="Project Story"
                  meta={{ text: story.enabled ? 'Live' : 'Off', dot: story.enabled }}
                />
              </Link>
            </li>
          )}

          {panels.map((panel) => (
            <li key={panel.id}>
              <PanelTrigger panelId={panel.id} className={ROW}>
                <RowBody icon={panel.icon} label={panel.label} meta={panelMeta[panel.id]}/>
              </PanelTrigger>
            </li>
          ))}
        </ul>
      </section>

      {children}
    </div>
  )
}