// components/project/RecentActivityPanel.jsx
//
// Quick-glance activity list shown inside the "Recent activity" dialog
// opened from the project sidebar (see app/dashboard/projects/[id]/page.jsx,
// the <ProjectPanelDialog panelId="activity"> block). That dialog already
// renders the "Recent activity" title and description, so this component
// only renders the list itself — no repeated heading in here.
//
// Shares its status colors/icons with UpdatesTab via updateStatus.js, so
// this quick-glance view always matches the full Updates tab.

import { getUpdateStatus } from './updateStatus'

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

export default function RecentActivityPanel({ updates = [], limit = 6 }) {
  const recent = updates.slice(0, limit)

  if (recent.length === 0) {
    return (
      <p className="text-xs text-fp-text-tertiary leading-relaxed">
        Nothing here yet — updates you post to this project will show up in this list.
      </p>
    )
  }

  return (
    <div>
      <p className="text-[11px] text-fp-text-tertiary mb-4">
        Showing {recent.length} most recent
        {updates.length > recent.length ? ` of ${updates.length}` : ''}
      </p>

      <ol className="relative space-y-5 before:absolute before:top-1.5 before:bottom-1.5 before:left-[5px] before:w-px before:bg-fp-border">
        {recent.map((update) => {
          const meta = getUpdateStatus(update.status)
          const Icon = meta.Icon
          return (
            <li key={update.id} className="relative pl-6">
              <span
                className={`absolute left-0 top-1 w-[11px] h-[11px] rounded-full ring-2 ring-fp-surface ${meta.dot}`}
                aria-hidden="true"
              />
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`w-3 h-3 ${meta.text}`} />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${meta.text}`}>
                  {meta.label}
                </span>
                <span className="text-[10px] text-fp-text-tertiary">
                  · {timeAgoShort(update.createdAt)}
                </span>
              </div>
              <p className="text-xs text-fp-text-secondary leading-relaxed line-clamp-2">
                {update.text}
              </p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}