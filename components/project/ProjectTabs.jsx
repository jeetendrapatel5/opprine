'use client'

import { useState } from 'react'
import { MessageSquare, FileText, Settings, Zap } from 'lucide-react'
import UpdatesTab from './UpdatesTab'
import FilesTab from './FilesTab'

export default function ProjectTabs({ project }) {
  const [activeTab, setActiveTab] = useState('updates')

  const tabs = [
    { id: 'updates', label: 'Updates', icon: MessageSquare },
    { id: 'files', label: 'Deliverables', icon: FileText },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* TAB NAVIGATION */}
      <div className="flex items-center px-6 border-b border-slate-100 bg-white">
        <div className="flex gap-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 text-sm font-medium transition-all relative ${
                  isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="p-6">
        {activeTab === 'updates' && <UpdatesTab project={project} />}
        {activeTab === 'files' && <FilesTab project={project} />}
      </div>
    </div>
  )
}