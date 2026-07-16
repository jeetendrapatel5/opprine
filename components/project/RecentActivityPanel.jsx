// components/project/RecentActivityPanel.jsx
//
// Example content for the "Activity" panel — proves the pattern extends
// to a second button with zero sidebar changes. This is a quick-glance
// list, distinct from the full <ProjectTabs> section already on the page.
//
// NOTE: `update.content` / `update.createdAt` below are a guess at your
// Update model's shape (matched to the fields referenced elsewhere in
// page.jsx). Adjust the field names to whatever your Prisma schema
// actually uses before shipping this.

import { FileText } from 'lucide-react'

function timeAgoShort(date) {
  if (!date) return null
  const diffMs = Date.now() - new Date(date).getTime()
  if (Number.isNaN(diffMs)) return null
  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default function RecentActivityPanel({ updates = [] }) {
  const recent = updates.slice(0, 6)

  return (
    <div className="bg-fp-surface border border-fp-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-fp-border flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-fp-raised border border-fp-border flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-fp-text-secondary" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-fp-text-primary">Recent activity</h3>
          <p className="text-[11px] text-fp-text-tertiary mt-0.5">
            {recent.length > 0
              ? `Last ${recent.length} update${recent.length !== 1 ? 's' : ''}`
              : 'No updates yet'}
          </p>
        </div>
      </div>

      {recent.length === 0 ? (
        <p className="px-4 py-4 text-[11px] text-fp-text-tertiary leading-relaxed">
          Updates you post to this project will show up here.
        </p>
      ) : (
        <ul className="divide-y divide-fp-border">
          {recent.map((update) => (
            <li key={update.id} className="px-4 py-3">
              <p className="text-xs text-fp-text-secondary leading-relaxed line-clamp-2">
                {update.content ?? update.title}
              </p>
              <p className="text-[10px] text-fp-text-tertiary mt-1">
                {timeAgoShort(update.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}