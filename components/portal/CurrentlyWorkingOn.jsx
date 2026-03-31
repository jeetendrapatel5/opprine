// components/portal/CurrentlyWorkingOn.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Shown only when a milestone is IN_PROGRESS.
// Answers the client's question: "what exactly is being built right now?"
//
// Design:
// - Warm portal card (fp-portal-surface), NOT dark.
// - The pulsing dot uses fp-portal-accent (amber) — "live" signal in warm amber.
//   This is consistent with the portal's amber theme.
// - Due date shown in fp-portal-accent — the target date feels like a promise.
// - The "Currently working on" label is small and secondary — the milestone
//   title is the primary read. Don't bury the headline under scaffolding.
//
// Server Component — pure display.
// ─────────────────────────────────────────────────────────────────────────────

function formatDueDate(date) {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-GB', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  })
}

export default function CurrentlyWorkingOn({ milestone }) {
  if (!milestone) return null
  const dueDateText = formatDueDate(milestone.dueDate)

  return (
    <div className="
      bg-fp-portal-surface border border-fp-portal-border rounded-xl
      px-5 py-4 mb-6 flex items-center gap-4
    ">

      {/* Pulsing amber dot — live signal */}
      {/* The outer ring (animate-ping) grows and fades, the inner dot stays solid */}
      <div className="relative shrink-0 w-8 h-8 flex items-center justify-center">
        <span className="
          absolute inline-flex w-full h-full rounded-full
          bg-fp-portal-accent opacity-20 animate-ping
        " />
        <span className="relative inline-flex w-3.5 h-3.5 rounded-full bg-fp-portal-accent" />
      </div>

      {/* Milestone name */}
      <div className="flex-1 min-w-0">
        <p className="text-fp-portal-text-tertiary text-[10px] font-bold uppercase tracking-widest mb-0.5">
          Currently working on
        </p>
        <p className="text-fp-portal-text-primary text-sm font-semibold truncate">
          {milestone.title}
        </p>
      </div>

      {/* Due date — only shown if the freelancer set one */}
      {dueDateText && (
        <div className="shrink-0 text-right">
          <p className="text-fp-portal-text-tertiary text-[10px] font-bold uppercase tracking-widest mb-0.5">
            Target date
          </p>
          <p className="text-fp-portal-accent text-xs font-semibold">
            {dueDateText}
          </p>
        </div>
      )}

    </div>
  )
}