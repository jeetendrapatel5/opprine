// components/project/ProjectTabs.jsx
'use client'

// Needs 'use client' for tab switching with useState

import { useState } from 'react'
import UpdatesTab from './UpdatesTab'
import FilesTab from './FilesTab'

export default function ProjectTabs({ project }) {
  // activeTab tracks which tab is currently shown
  const [activeTab, setActiveTab] = useState('updates')

  return (
    <div>

      {/* Tab buttons */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">

        <button
          onClick={() => setActiveTab('updates')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'updates'
              ? 'bg-white text-gray-900 shadow-sm'   // active tab
              : 'text-gray-500 hover:text-gray-700'   // inactive tab
          }`}
        >
          Updates
        </button>

        <button
          onClick={() => setActiveTab('files')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'files'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Files
        </button>

      </div>

      {/* Tab content — show only the active tab */}
      {activeTab === 'updates' && (
        <UpdatesTab project={project} />
      )}

      {activeTab === 'files' && (
        <FilesTab project={project} />
      )}

    </div>
  )
}