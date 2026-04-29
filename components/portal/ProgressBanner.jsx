// components/portal/ProgressBanner.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The first thing the client sees. The most important component in the portal.
//
// PSYCHOLOGICAL JOB:
// Answer the client's primary anxiety — "is my money being spent on real work?"
// — within 2 seconds. The progress bar does this without the client having
// to read anything. It is the trust signal that everything else builds on.
//
// Design decisions:
// - Warm white card (fp-portal-surface) — NOT dark. Dark backgrounds signal
//   opacity and uncertainty to non-technical clients. Light = transparency.
// - Project name in Fraunces — the display font signals this was "made for you",
//   not generated from a template. It looks like a premium deliverable header.
// - Progress bar in fp-portal-accent (amber) — gold signals value and investment.
//   When it hits 100%, it flips to fp-portal-success (green) — completion.
// - The amber accent line at the top of the card is 2px — structural, not decorative.
//   It's the card's "signature", using the portal accent color.
// - "Last updated X ago" at the bottom right — this is the timestamp trust signal.
//   A client who hasn't heard from their freelancer in 3 days will feel reassured
//   to see "Last update 6h ago". Absence of this is also meaningful.
//
// Server Component — no state, pure display.
// ─────────────────────────────────────────────────────────────────────────────

function timeAgo(date) {
  if (!date) return null
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60)    return 'just now'
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  const days = Math.floor(seconds / 86400)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

// Finds the most recent update timestamp across all milestones' work log entries.
// This reflects "when did the freelancer last post real work", not "when was
// the milestone record last touched by the system".
function getLastUpdatedDate(milestones) {
  const allUpdates = milestones.flatMap(m => m.milestoneUpdates ?? [])
  if (allUpdates.length === 0) return null
  allUpdates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return allUpdates[0].createdAt
}

// Status badge config — each project status maps to a label and portal token colors
const statusConfig = {
  ON_TRACK: {
    label:     'On Track',
    className: 'bg-fp-portal-success/10 text-fp-portal-success border border-fp-portal-success/20',
  },
  AWAITING_REVIEW: {
    label:     'Awaiting Your Review',
    className: 'bg-fp-portal-accent/10 text-fp-portal-accent border border-fp-portal-accent/20',
  },
  COMPLETED: {
    label:     'Project Complete',
    className: 'bg-fp-portal-success/10 text-fp-portal-success border border-fp-portal-success/20',
  },
}

export default function ProgressBanner({ progress, projectName, clientName, milestones }) {
  const { completed, total, percentage, projectStatus } = progress
  const status          = statusConfig[projectStatus] ?? statusConfig.ON_TRACK
  const lastUpdated     = getLastUpdatedDate(milestones)
  const lastUpdatedText = timeAgo(lastUpdated)

  return (
    <div className="bg-fp-portal-surface border border-fp-portal-border rounded-xl overflow-hidden mb-6">

      <div className="px-6 py-7 sm:px-8 sm:py-8">

        {/* ── Top row: project name + status badge ── */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            {/* Addressed to the client — personal, possessive */}
            <p className="text-fp-portal-text-tertiary text-xs font-semibold uppercase tracking-widest mb-1.5">
              {clientName}'s Portal
            </p>
            {/* Project name — Fraunces, the display headline */}
            <h1 className="font-display text-2xl sm:text-3xl font-medium text-fp-portal-text-primary leading-tight tracking-tight">
              {projectName}
            </h1>
          </div>

          <span className={`
            shrink-0 mt-1 text-xs font-semibold px-3 py-1.5 rounded-full
            ${status.className}
          `}>
            {status.label}
          </span>
        </div>

        {/* ── Progress bar ── */}
        {/* Track — the background rail */}
        <div className="w-full bg-fp-portal-raised rounded-full h-2 mb-3">
          {/* Fill — width must be an inline style because Tailwind purges
              dynamic percentage values at build time.
              The color transitions from amber (in progress) to green (100%). */}
          <div
            className="h-2 rounded-full transition-all duration-700"
            style={{
              width:      `${Math.max(percentage, 4)}%`,
              background: percentage === 100
                ? 'var(--color-fp-portal-success)'
                : 'var(--color-fp-portal-accent)',
            }}
          />
        </div>

        {/* ── Bottom row: milestone count + last updated ── */}
        <div className="flex items-center justify-between text-xs text-fp-portal-text-tertiary">
          <span>
            <span className="text-fp-portal-text-primary font-semibold">{completed}</span>
            {' of '}
            <span className="text-fp-portal-text-primary font-semibold">{total}</span>
            {' milestones complete'}
          </span>

          {/* Timestamp trust signal — only shown when updates exist */}
          {lastUpdatedText && (
            <span>Last update {lastUpdatedText}</span>
          )}
        </div>

      </div>
    </div>
  )
}