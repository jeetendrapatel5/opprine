// components/portal/UpdateFeed.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Shows the project-level update log to the client.
// These are the legacy Update model entries (text + status).
//
// Design changes from old version:
// - Removed emoji icons (🔄 👀 ✅) — emojis look unprofessional on a $10k
//   project portal. A freelancer who charges premium rates doesn't use emojis
//   as status indicators. We use colored dots + text labels instead.
// - Removed colorful card backgrounds (bg-blue-50, bg-yellow-50, bg-green-50)
//   — portal cards are fp-portal-surface (white) with a subtle left border
//   in the status color. This is the premium editorial approach.
// - Timestamps use full relative strings, not "X minutes ago" — more readable.
//
// Server Component — pure display.
// ─────────────────────────────────────────────────────────────────────────────

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60)    return 'just now'
  if (seconds < 3600)  return `${Math.floor(seconds / 60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  const days = Math.floor(seconds / 86400)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

// Status config — dot color + label, using portal CSS variable names
const updateConfig = {
  IN_PROGRESS: {
    label:    'In Progress',
    dotClass: 'bg-fp-portal-accent',
    textClass: 'text-fp-portal-accent',
  },
  IN_REVIEW: {
    label:    'In Review',
    dotClass: 'bg-fp-portal-accent',
    textClass: 'text-fp-portal-accent',
  },
  DONE: {
    label:    'Completed',
    dotClass: 'bg-fp-portal-success',
    textClass: 'text-fp-portal-success',
  },
}

function EmptyUpdates() {
  return (
    <div className="
      bg-fp-portal-surface border border-dashed border-fp-portal-border
      rounded-xl py-10 flex flex-col items-center gap-2
    ">
      <p className="text-fp-portal-text-secondary text-sm font-medium">
        No updates yet
      </p>
      <p className="text-fp-portal-text-tertiary text-xs text-center max-w-[220px] leading-relaxed">
        Your developer will post updates here as work progresses.
      </p>
    </div>
  )
}

export default function UpdateFeed({ updates }) {
  if (!updates || updates.length === 0) return <EmptyUpdates />

  return (
    <div className="space-y-3">
      {updates.map((update) => {
        const config = updateConfig[update.status] ?? updateConfig.IN_PROGRESS

        return (
          <div
            key={update.id}
            className="
              bg-fp-portal-surface border border-fp-portal-border rounded-xl p-4
              hover:border-fp-portal-border/60 transition-colors duration-150
            "
          >
            {/* Status label + dot */}
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotClass}`} />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${config.textClass}`}>
                {config.label}
              </span>
            </div>

            {/* Update text */}
            <p className="text-fp-portal-text-primary text-sm leading-relaxed">
              {update.text}
            </p>

            {/* Timestamp */}
            <p className="text-fp-portal-text-tertiary text-xs mt-2">
              {timeAgo(update.createdAt)}
            </p>
          </div>
        )
      })}
    </div>
  )
}