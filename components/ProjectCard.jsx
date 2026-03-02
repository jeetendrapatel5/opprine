import Link from 'next/link'

const statusConfig = {
  ACTIVE:    { label: 'Active',    class: 'bg-green-100 text-green-700' },
  COMPLETED: { label: 'Completed', class: 'bg-blue-100 text-blue-700' },
  ON_HOLD:   { label: 'On Hold',   class: 'bg-yellow-100 text-yellow-700' },
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  return `${Math.floor(seconds / 86400)} days ago`
}

export default function ProjectCard({ project }) {
  const status = statusConfig[project.status]
  const lastUpdate = project.updates[0]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between hover:border-blue-300 transition-colors">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h3 className="font-semibold text-gray-900">{project.name}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.class}`}>
            {status.label}
          </span>
        </div>

        <p className="text-sm text-gray-500">
          Client: {project.client?.name ?? 'No client yet'}
        </p>

        <p className="text-xs text-gray-400 mt-1">
          {lastUpdate
            ? `Last update: ${timeAgo(lastUpdate.createdAt)}`
            : 'No updates yet'
          }
        </p>
      </div>

      <Link
        href={`/dashboard/projects/${project.id}`}
        className="text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
      >
        View →
      </Link>

    </div>
  )
}