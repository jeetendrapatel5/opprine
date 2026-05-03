import FileAttachment from './FileAttachment'

// ─────────────────────────────────────────────────────────────────────────────
// MILESTONE UPDATE FEED
//
// Renders the list of MilestoneUpdate records as a vertical timeline.
// Each update can carry a note and an optional attached file.
//
// This is a Server Component — no interactivity needed, no "use client".
// Dates are formatted server-side to avoid hydration mismatches.
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  const date = new Date(dateStr)
  const now  = new Date()
  const diffMs   = now - date
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHrs  = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHrs / 24)

  if (diffMins < 1)   return 'just now'
  if (diffMins < 60)  return `${diffMins}m ago`
  if (diffHrs  < 24)  return `${diffHrs}h ago`
  if (diffDays < 7)   return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Single timeline entry
function UpdateEntry({ update, isLast }) {
  return (
    <div className="relative pl-6">

      {/* Connector line — hidden on the last entry */}
      {!isLast && (
        <div
          className="absolute left-[5px] top-4 bottom-0 w-px bg-fp-portal-border"
          aria-hidden="true"
        />
      )}

      {/* Timeline dot */}
      <div
        className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-fp-portal-surface border-2 border-fp-portal-accent/50"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="space-y-2 pb-5">
        <time
          dateTime={update.createdAt}
          className="text-xs text-fp-portal-text-tertiary font-medium"
        >
          {formatDate(update.createdAt)}
        </time>

        <p className="text-sm text-fp-portal-text-secondary leading-relaxed">
          {update.note}
        </p>

        {update.fileUrl && (
          <FileAttachment
            name={update.fileName}
            url={update.fileUrl}
            fileType={update.fileType}
            fileSize={update.fileSize}
          />
        )}
      </div>
    </div>
  )
}

export default function MilestoneUpdateFeed({ updates }) {
  if (!updates?.length) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-fp-portal-text-tertiary">
        Progress Notes
      </p>

      <div className="mt-3">
        {updates.map((update, i) => (
          <UpdateEntry
            key={update.id}
            update={update}
            isLast={i === updates.length - 1}
          />
        ))}
      </div>
    </div>
  )
}