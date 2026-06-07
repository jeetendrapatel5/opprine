// components/ProjectCard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// A single project in the dashboard list. This is the most-seen component
// in the entire freelancer experience — they look at this list every day.
//
// Design decisions:
// - LEFT ACCENT STRIP: A 3px vertical bar on the left edge whose color matches
//   the project status. This is the first thing the eye lands on — before even
//   reading the name. It creates a visual "anchor" and groups status with the
//   whole card instead of just the badge.
//
// - CLIENT AVATAR: The client's first initial rendered in a small circle on
//   the right. It makes the card feel like it represents a real relationship,
//   not just a row in a database. Disappears when no client is assigned.
//
// - METADATA ROW AT BOTTOM: Client name and last-update timestamp are now
//   separated from the name row with a visible divider line. This creates
//   two clear zones: "what is this project" (top) and "what's the context"
//   (bottom). Cleaner than squeezing both into one row.
//
// - STATUS BADGE: Now uses a filled dot instead of the Lucide icon. Smaller,
//   quieter, but still instantly scannable. The badge itself has a subtle
//   border for depth.
//
// - HOVER STATE: The card lifts via translateY(-1px) and box-shadow deepens.
//   The left accent strip grows from 3px to 4px. The "View →" arrow slides
//   right. These three micro-animations together feel intentional, not cheap.
//
// - OVERFLOW HIDDEN ON WRAPPER: Needed so the left accent strip (which is
//   absolutely positioned) clips cleanly inside the rounded corners.
//
// - Entire card is still a Link. Fitts's Law still applies.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import { Clock, ChevronRight } from 'lucide-react'
import DeleteProjectButton from '@/components/DeleteProjectButton'

// ─── Status config ────────────────────────────────────────────────────────────
// Each status maps to:
//  label       — display text for the badge
//  dotClass    — the colored dot inside the badge (bg-* color)
//  badgeClass  — text + background + border colors for the pill
//  stripClass  — the left accent strip color
//  avatarClass — background color for the client initial avatar
//
// We use fp- tokens throughout — no raw hex, no Tailwind default colors.
const statusConfig = {
  ACTIVE: {
    label: 'Active',
    dotClass:   'bg-fp-accent',
    badgeClass: 'text-fp-accent',
    avatarClass:'bg-fp-accent-muted text-fp-accent',
  },
  COMPLETED: {
    label: 'Done',
    dotClass:   'bg-fp-success',
    badgeClass: 'text-fp-success',
    avatarClass:'bg-fp-success/10 text-fp-success',
  },
  ON_HOLD: {
    label: 'On Hold',
    dotClass:   'bg-fp-warning',
    badgeClass: 'text-fp-warning',
    avatarClass:'bg-fp-warning/10 text-fp-warning',
  },
}

// ─── timeAgo ─────────────────────────────────────────────────────────────────
// Converts a timestamp into a short relative string: "2h ago", "3d ago", etc.
// For dates older than 7 days, shows a locale date like "12 Jun" instead of
// "14d ago" which loses human meaning past a week.
function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60)     return 'just now'
  if (seconds < 3600)   return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400)  return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ─── getInitial ───────────────────────────────────────────────────────────────
// Extracts the first character of a name for the avatar circle.
// "Acme Corp" → "A", "john doe" → "J"
function getInitial(name) {
  return name?.trim()?.[0]?.toUpperCase() ?? '?'
}

// ─── ProjectCard ──────────────────────────────────────────────────────────────
export default function ProjectCard({ project }) {
  // Fall back to ACTIVE config if we get an unknown status value from Prisma.
  const status     = statusConfig[project.status] ?? statusConfig.ACTIVE
  const lastUpdate = project.updates?.[0]
  const clientName = project.client?.name

  return (
    // `group` — enables child elements to react to this card being hovered
    //           via `group-hover:*` utility classes.
    // `relative overflow-hidden` — required so the absolutely-positioned
    //           left accent strip clips to the card's rounded corners.
    // `transition-all duration-200` — covers border-color, background,
    //           and box-shadow changes on hover in one declaration.
    <Link
      href={`/dashboard/projects/${project.id}`}
      className="
        group relative block overflow-hidden
        bg-fp-surface border border-fp-border rounded-xl
        transition-all duration-200
        hover:border-fp-accent/40
        hover:bg-fp-raised
        hover:shadow-[0_4px_24px_-4px_rgba(123,147,255,0.12)]
      "
    >

      {/* ── Card Body ─────────────────────────────────────────────────────── */}
      {/* pl-5 accounts for the strip width plus spacing. pr-4 is standard. */}
      <div className="pl-5 pr-4 py-4">

        {/* ── Top Row: Name · Badge · Actions ─────────────────────────── */}
        <div className="flex items-start justify-between gap-3">

          {/* Left side: project name + status badge */}
          <div className="min-w-0 flex-1 flex items-center gap-3">

            {/* Project name — primary label, truncated if long.
                `leading-snug` tightens the line-height so the name sits
                visually closer to the metadata row below it. */}
            <h3 className="
              text-fp-text-primary font-semibold text-[15px]
              truncate leading-snug min-w-0
            ">
              {project.name}
            </h3>

            {/* Status badge — dot + label. Simpler than an icon; easier to
                scan when there are many cards in a list.
                `shrink-0` prevents it from compressing when the name is long. */}
            <span className={`
              shrink-0 flex items-center gap-1
              text-[8px] font-semibold uppercase tracking-widest
              px-2 py-0.5 rounded-full
              ${status.badgeClass}
            `}>
              {/* Filled dot — the color is the status signal, not the icon shape */}
              <span className={`w-1 h-1 rounded-full shrink-0 ${status.dotClass}`} />
              {status.label}
            </span>

          </div>

          {/* Right side: delete button + view affordance */}
          <div className="flex items-center gap-1.5 shrink-0">

            {/* DeleteProjectButton is a Client Component. It's opacity-0 by
                default and fades in on card hover (handled inside that
                component via `group-hover:opacity-100`). */}
            <DeleteProjectButton
              projectId={project.id}
              projectName={project.name}
            />

            {/* View → affordance. The arrow slides 2px right on hover to signal
                "this is the direction of travel". */}
            <span className="
              flex items-center gap-0.5 text-[12px] font-medium
              text-fp-text-tertiary group-hover:text-fp-accent
              transition-colors duration-200
            ">
              View
              <span className="
                inline-block
                group-hover:translate-x-0.5
                transition-transform duration-200
              ">
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </span>

          </div>
        </div>

        {/* ── Divider ──────────────────────────────────────────────────────
            A hairline between the name row and the metadata row.
            Creates two clear visual zones without adding padding.
            `my-3` gives it breathing room. */}
        <div className="my-3 h-px bg-fp-border/60" />

        {/* ── Bottom Row: Client avatar · Client name · Dot · Timestamp ── */}
        <div className="flex items-center justify-between gap-3">

          <div className="flex items-center gap-2 min-w-0">

            {/* Client avatar — shows the first initial of the client's name
                in a small circle. It makes the card feel relational.
                Only rendered if a client is linked to this project. */}
            {clientName && (
              <span className={`
                shrink-0 w-5 h-5 rounded-full text-[10px] font-bold
                flex items-center justify-center
                ${status.avatarClass}
              `}>
                {getInitial(clientName)}
              </span>
            )}

            {/* Client name — truncated to prevent overflow */}
            {clientName && (
              <span className="text-xs text-fp-text-secondary truncate max-w-[130px] font-medium">
                {clientName}
              </span>
            )}

            {/* Separator dot — only shown when BOTH client and update exist */}
            {clientName && lastUpdate && (
              <span className="shrink-0 w-1 h-1 rounded-full bg-fp-border" />
            )}

            {/* Last update timestamp — variable reward signal.
                The Clock icon reinforces that this is time-related. */}
            {lastUpdate ? (
              <span className="flex items-center gap-1 text-xs text-fp-text-tertiary shrink-0">
                <Clock className="w-3 h-3" />
                {timeAgo(lastUpdate.createdAt)}
              </span>
            ) : (
              <span className="text-xs text-fp-text-tertiary italic">
                No updates yet
              </span>
            )}

          </div>

          {/* Update indicator dot — pulses if there was a recent update
              (within last 24 hours). It's a subtle "something new" signal
              without being as intrusive as a badge. */}
          {lastUpdate && (() => {
            const isRecent =
              (new Date() - new Date(lastUpdate.createdAt)) / 1000 < 86400
            return isRecent ? (
              <span className="shrink-0 relative flex h-2 w-2">
                {/* Ping ring — the animated outer ring */}
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fp-accent opacity-60" />
                {/* Solid center dot */}
                <span className="relative inline-flex h-2 w-2 rounded-full bg-fp-accent" />
              </span>
            ) : null
          })()}

        </div>
      </div>
    </Link>
  )
}