// components/portal/ProgressBanner.jsx
//
// This is a SERVER COMPONENT (no 'use client' directive).
// It receives pre-computed data as props — it does no fetching itself.
//
// Props:
//   progress     — the object returned by getProjectProgress()
//                  shape: { completed, total, percentage, projectStatus, currentMilestone }
//   projectName  — string — the project's name
//   milestones   — the full milestones array from Prisma
//                  We need this to compute "last updated X ago"

// ── Helpers ─────────────────────────────────────────────────────────────────

// Returns a human-readable "X days ago" string from a JS Date or ISO string.
// Called at render time on the server, so it reflects the time the page loaded.
function timeAgo(date) {
  if (!date) return null
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60)   return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  const days = Math.floor(seconds / 86400)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

// Finds the most recent MilestoneUpdate across ALL milestones.
// Each milestone has a milestoneUpdates array. We flatten them all,
// find the one with the latest createdAt, and return its date.
//
// WHY: "Last updated" should reflect when the freelancer last posted
// any work log entry — not when the milestone record itself changed.
function getLastUpdatedDate(milestones) {
  // Flatten: take every milestone's milestoneUpdates array and merge into one list
  const allUpdates = milestones.flatMap(m => m.milestoneUpdates ?? [])

  if (allUpdates.length === 0) return null

  // Sort descending by createdAt — newest first
  // new Date(b.createdAt) - new Date(a.createdAt) gives a positive number
  // when b is newer, so b sorts before a
  allUpdates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return allUpdates[0].createdAt
}

// ── Status badge config ──────────────────────────────────────────────────────
// Each projectStatus maps to a label and a visual style.
// These use inline Tailwind classes that match the portal's amber accent palette.

const statusConfig = {
  ON_TRACK: {
    label: 'On Track',
    // Subtle green — project is moving, nothing needs attention
    className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  },
  AWAITING_REVIEW: {
    label: 'Awaiting Your Review',
    // Amber — matches the portal accent, signals action needed
    className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  },
  COMPLETED: {
    label: 'Project Complete',
    // Blue — calm, celebratory
    className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  },
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ProgressBanner({ progress, projectName, milestones }) {
  const { completed, total, percentage, projectStatus } = progress
  const status       = statusConfig[projectStatus] ?? statusConfig.ON_TRACK
  const lastUpdated  = getLastUpdatedDate(milestones)
  const lastUpdatedText = timeAgo(lastUpdated)

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/5 p-6 md:p-8 mb-8"
      style={{ background: 'linear-gradient(135deg, #0e0e12 0%, #0a0a0d 100%)' }}
    >
      {/* Decorative amber glow — top-right corner */}
      {/* This is a purely visual div. It creates a soft light bloom effect */}
      {/* using a radial gradient fading to transparent. */}
      <div
        className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #F59E0B 0%, transparent 70%)' }}
      />

      {/* ── Top row — project name + status badge ── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          {/* Small label above the project name — acts as a section marker */}
          <p
            className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1"
            style={{ color: '#F59E0B', fontFamily: 'DM Mono, monospace' }}
          >
            Project Progress
          </p>

          {/* Project name — uses Fraunces serif to match portal headline style */}
          <h1
            className="text-2xl md:text-3xl font-bold text-white leading-tight"
            style={{ fontFamily: 'Fraunces, Georgia, serif' }}
          >
            {projectName}
          </h1>
        </div>

        {/* Status badge — dynamically styled based on projectStatus */}
        <span
          className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full ${status.className}`}
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          {status.label}
        </span>
      </div>

      {/* ── Progress bar ── */}
      {/* Outer track — the gray background bar */}
      <div className="w-full bg-white/5 rounded-full h-2.5 mb-3">
        {/* Inner fill — width is set via inline style because Tailwind cannot */}
        {/* interpolate dynamic percentage values at build time.             */}
        {/* e.g. className="w-[40%]" would not work — Tailwind purges it.   */}
        <div
          className="h-2.5 rounded-full transition-all duration-700"
          style={{
            width: `${percentage}%`,
            background: percentage === 100
              ? 'linear-gradient(90deg, #34d399, #10b981)' // green when complete
              : 'linear-gradient(90deg, #F59E0B, #FBBF24)', // amber otherwise
          }}
        />
      </div>

      {/* ── Bottom row — milestone count + last updated ── */}
      <div
        className="flex items-center justify-between text-xs"
        style={{ color: '#6b7280', fontFamily: 'DM Mono, monospace' }}
      >
        {/* Milestone completion count */}
        <span>
          <span className="text-white font-semibold">{completed}</span>
          {' of '}
          <span className="text-white font-semibold">{total}</span>
          {' milestones complete'}
        </span>

        {/* Last updated timestamp — only shown if any updates exist */}
        {lastUpdatedText && (
          <span>Last update {lastUpdatedText}</span>
        )}
      </div>
    </div>
  )
}