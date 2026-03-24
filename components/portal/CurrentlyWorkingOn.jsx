// components/portal/CurrentlyWorkingOn.jsx
//
// SERVER COMPONENT — no 'use client' needed, no state, pure display.
//
// Props:
//   milestone — a single milestone object (the IN_PROGRESS one)
//               shape: { id, title, dueDate, ... }
//
// This component is ONLY rendered when a milestone is IN_PROGRESS.
// The decision of whether to render it lives in the portal page, not here.
// This component just handles the display.

// Formats a date like "Due 12 Sep 2025"
// toLocaleDateString options:
//   day: 'numeric'  → "12"  (no leading zero)
//   month: 'short'  → "Sep"
//   year: 'numeric' → "2025"
function formatDueDate(date) {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-GB', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  })
}

export default function CurrentlyWorkingOn({ milestone }) {
  // Safety — if somehow called with no milestone, render nothing
  if (!milestone) return null

  const dueDateText = formatDueDate(milestone.dueDate)

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/5 px-6 py-5 mb-8 flex items-center gap-5"
      style={{ background: '#0e0e12' }}
    >
      {/* Pulsing indicator dot */}
      {/* The outer ring is the "ping" animation — it grows and fades out. */}
      {/* The inner dot stays solid. Together they create a live/active signal. */}
      <div className="relative shrink-0 flex items-center justify-center w-10 h-10">
        <span className="absolute inline-flex w-full h-full rounded-full bg-blue-500 opacity-20 animate-ping" />
        <span className="relative inline-flex w-4 h-4 rounded-full bg-blue-500" />
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        {/* Label */}
        <p
          className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5"
          style={{ color: '#6b7280', fontFamily: 'DM Mono, monospace' }}
        >
          Currently working on
        </p>

        {/* Milestone title — truncated if very long */}
        <p
          className="text-base font-semibold text-white truncate"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          {milestone.title}
        </p>
      </div>

      {/* Due date — only shown if the freelancer set one */}
      {dueDateText && (
        <div className="shrink-0 text-right">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.15em] mb-0.5"
            style={{ color: '#6b7280', fontFamily: 'DM Mono, monospace' }}
          >
            Target date
          </p>
          <p
            className="text-sm font-semibold"
            style={{ color: '#F59E0B', fontFamily: 'DM Mono, monospace' }}
          >
            {dueDateText}
          </p>
        </div>
      )}
    </div>
  )
}