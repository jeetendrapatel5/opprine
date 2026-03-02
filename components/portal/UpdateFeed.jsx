// components/portal/UpdateFeed.jsx

// Config for each update status — color + icon + label
const updateConfig = {
  IN_PROGRESS: {
    label: 'In Progress',
    icon: '🔄',
    class: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  IN_REVIEW: {
    label: 'In Review',
    icon: '👀',
    class: 'bg-yellow-50 text-yellow-700 border-yellow-200'
  },
  DONE: {
    label: 'Done',
    icon: '✅',
    class: 'bg-green-50 text-green-700 border-green-200'
  },
}

// Reusing same timeAgo function
function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  return `${Math.floor(seconds / 86400)} days ago`
}

export default function UpdateFeed({ updates }) {
  return (
    <div className="flex flex-col gap-3">
      {updates.map((update) => {
        const config = updateConfig[update.status]

        return (
          <div
            key={update.id}
            className={`rounded-xl border p-4 ${config.class}`}
          >
            {/* Status badge */}
            <div className="flex items-center gap-2 mb-2">
              <span>{config.icon}</span>
              <span className="text-xs font-semibold uppercase tracking-wide">
                {config.label}
              </span>
            </div>

            {/* Update text */}
            <p className="text-sm text-gray-800 leading-relaxed">
              {update.text}
            </p>

            {/* Timestamp */}
            <p className="text-xs text-gray-400 mt-2">
              {timeAgo(update.createdAt)}
            </p>
          </div>
        )
      })}
    </div>
  )
}