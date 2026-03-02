// components/project/ProjectHeader.jsx
'use client'

// Needs 'use client' for the copy-to-clipboard button
import { useState } from 'react'

const statusConfig = {
  ACTIVE:    { label: 'Active',    class: 'bg-green-100 text-green-700' },
  COMPLETED: { label: 'Completed', class: 'bg-blue-100 text-blue-700' },
  ON_HOLD:   { label: 'On Hold',   class: 'bg-yellow-100 text-yellow-700' },
}

export default function ProjectHeader({ project, portalLink }) {
  const [copied, setCopied] = useState(false)
  const status = statusConfig[project.status]

  const copyPortalLink = () => {
    // navigator.clipboard is the browser API to copy text
    navigator.clipboard.writeText(portalLink)
    setCopied(true)
    // Reset button text after 2 seconds
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">

      {/* Top row — name + status */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {project.name}
          </h1>
          {project.description && (
            <p className="text-sm text-gray-500 mt-1">
              {project.description}
            </p>
          )}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.class}`}>
          {status.label}
        </span>
      </div>

      <hr className="my-4 border-gray-100" />

      {/* Bottom row — client info + portal link */}
      <div className="flex items-center justify-between flex-wrap gap-3">

        <div>
          <p className="text-xs text-gray-400">Client</p>
          <p className="text-sm font-medium text-gray-700">
            {project.client?.name}
          </p>
          <p className="text-xs text-gray-400">
            {project.client?.email}
          </p>
        </div>

        {/* Portal link copy button */}
        {project.client && (
          <button
            onClick={copyPortalLink}
            className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-sm text-gray-700 px-4 py-2 rounded-lg transition-colors"
          >
            {/* Show checkmark after copy, link icon before */}
            {copied ? '✅' : '🔗'}
            {copied ? 'Link Copied!' : 'Copy Client Portal Link'}
          </button>
        )}

      </div>
    </div>
  )
}