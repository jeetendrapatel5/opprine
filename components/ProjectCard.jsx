// components/ProjectCard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// A single project in the dashboard list. This is the most-seen component
// in the entire freelancer experience — they look at this list every day.
//
// Design decisions:
// - Entire card is a Link — not just the "View" button. Bigger click target
//   reduces friction. The "View →" text still exists but is a visual affordance,
//   not the only clickable area. (Fitts's Law: bigger targets = less effort.)
// - Status badge uses our semantic color system, not Tailwind defaults.
//   The badge is the first thing the eye goes to after the project name.
// - Client name is secondary — in the hierarchy of information the freelancer
//   needs: "what project" > "what state" > "which client" > "when updated".
// - "Last update" timestamp is the variable reward signal. It tells the
//   freelancer "something happened" and triggers the urge to check.
// - Hover state shifts the entire card border to fp-accent — the whole card
//   glows slightly, signaling "this is interactive".
// - The arrow (→) is text-fp-text-tertiary by default, shifts to fp-accent on
//   card hover. This movement draws the eye toward the action.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import { Circle, CheckCircle2, PauseCircle, Clock } from 'lucide-react'

// Status config maps Prisma enum values to display properties.
// Using our fp- design tokens, NOT Tailwind defaults.
const statusConfig = {
  ACTIVE: {
    label:      'Active',
    badgeClass: 'bg-fp-accent-muted text-fp-accent border-fp-accent/20',
    Icon:       Circle,
  },
  COMPLETED: {
    label:      'Completed',
    badgeClass: 'bg-fp-success/10 text-fp-success border-fp-success/20',
    Icon:       CheckCircle2,
  },
  ON_HOLD: {
    label:      'On Hold',
    badgeClass: 'bg-fp-warning/10 text-fp-warning border-fp-warning/20',
    Icon:       PauseCircle,
  },
}

// Converts a timestamp to a human-readable relative string.
// Used for "Last update: 2h ago" — the variable reward signal.
function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60)     return 'just now'
  if (seconds < 3600)   return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400)  return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  // Older than a week — show the date rather than "14d ago" which loses meaning
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function ProjectCard({ project }) {
  const status     = statusConfig[project.status] ?? statusConfig.ACTIVE
  const StatusIcon = status.Icon
  const lastUpdate = project.updates?.[0]

  return (
    // The entire card is a Link. group class enables child hover states
    // that react when the parent card is hovered.
    <Link
      href={`/dashboard/projects/${project.id}`}
      className="
        group block bg-fp-surface border border-fp-border rounded-xl p-5
        hover:border-fp-accent/50 transition-colors duration-150
        hover:bg-fp-raised
      "
    >
      <div className="flex items-center justify-between gap-4">

        {/* ── Left: Project info ── */}
        <div className="min-w-0 flex-1">

          {/* Row 1: Name + status badge */}
          <div className="flex items-center gap-3 mb-2">

            {/* Project name — truncated if long, primary visual weight */}
            <h3 className="text-fp-text-primary font-semibold text-sm truncate leading-snug">
              {project.name}
            </h3>

            {/* Status badge — small pill with icon + label */}
            {/* border variant of badge — softer than a solid background */}
            <span className={`
              shrink-0 inline-flex items-center gap-1.5
              text-[11px] font-semibold uppercase tracking-wide
              px-2 py-0.5 rounded border
              ${status.badgeClass}
            `}>
              <StatusIcon className="w-2.5 h-2.5" />
              {status.label}
            </span>

          </div>

          {/* Row 2: Client name + last update */}
          <div className="flex items-center gap-3 text-xs text-fp-text-tertiary">

            {/* Client name */}
            {project.client?.name && (
              <>
                <span className="truncate max-w-[140px]">
                  {project.client.name}
                </span>
                {/* Separator dot — only show if there's also an update */}
                {lastUpdate && (
                  <span className="shrink-0 w-1 h-1 rounded-full bg-fp-border" />
                )}
              </>
            )}

            {/* Last update timestamp — the variable reward hook */}
            {lastUpdate ? (
              <span className="flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3" />
                Updated {timeAgo(lastUpdate.createdAt)}
              </span>
            ) : (
              <span className="italic text-fp-text-tertiary">No updates yet</span>
            )}

          </div>

        </div>

        {/* ── Right: View arrow ── */}
        {/* Shifts color on card hover — a motion cue that "this goes somewhere" */}
        <span className="
          shrink-0 text-fp-text-tertiary text-sm font-medium
          group-hover:text-fp-accent transition-colors duration-150
          flex items-center gap-1
        ">
          View
          <span className="group-hover:translate-x-0.5 transition-transform duration-150 inline-block">
            →
          </span>
        </span>

      </div>
    </Link>
  )
}