// components/portal/PortalHeader.jsx

// Status badge config — same pattern as ProjectCard
const statusConfig = {
  ACTIVE:    { label: 'Active',    class: 'bg-green-100 text-green-700' },
  COMPLETED: { label: 'Completed', class: 'bg-blue-100 text-blue-700' },
  ON_HOLD:   { label: 'On Hold',   class: 'bg-yellow-100 text-yellow-700' },
}

export default function PortalHeader({ project, clientName, freelancerName }) {
  const status = statusConfig[project.status]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">

      {/* Project name + status */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {project.name}
          </h1>
          {project.description && (
            <p className="text-gray-500 text-sm mt-1">
              {project.description}
            </p>
          )}
        </div>

        <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.class}`}>
          {status.label}
        </span>
      </div>

      {/* Divider */}
      <hr className="my-4 border-gray-100" />

      {/* Meta info */}
      <div className="flex gap-6">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Your Name</p>
          <p className="text-sm font-medium text-gray-700">{clientName}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Freelancer</p>
          <p className="text-sm font-medium text-gray-700">{freelancerName}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Project Started</p>
          <p className="text-sm font-medium text-gray-700">
            {new Date(project.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </p>
        </div>
      </div>

    </div>
  )
}