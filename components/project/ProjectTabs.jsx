'use client'

import { useState } from 'react'
import { MessageSquare, FileText, Receipt } from 'lucide-react'
import UpdatesTab  from './UpdatesTab'
import FilesTab    from './FilesTab'
import InvoicesTab from '@/components/dashboard/invoices/InvoicesTab'

export default function ProjectTabs({ project }) {
  const [activeTab, setActiveTab] = useState('updates')

  const tabs = [
    {
      id:    'updates',
      label: 'Updates',
      icon:  MessageSquare,
      count: project.updates?.length ?? 0,
    },
    {
      id:    'files',
      label: 'Deliverables',
      icon:  FileText,
      count: project.files?.length ?? 0,
    },
    {
      id:    'invoices',
      label: 'Invoices',
      icon:  Receipt,
      count: project.invoices?.length ?? 0,
    },
  ]

  return (
    <div>

      {/* Tab bar */}
      <div className="flex items-center border-b border-fp-border px-5">
        {tabs.map((tab) => {
          const Icon     = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative flex items-center gap-2 py-3.5 px-3 mr-1
                text-xs font-semibold transition-colors duration-150
                ${isActive
                  ? 'text-fp-accent'
                  : 'text-fp-text-tertiary hover:text-fp-text-secondary'
                }
              `}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}

              {/* Count badge — muted when inactive, accent-tinted when active */}
              {tab.count > 0 && (
                <span className={`
                  text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums
                  ${isActive
                    ? 'bg-fp-accent-muted text-fp-accent'
                    : 'bg-fp-raised text-fp-text-tertiary'
                  }
                `}>
                  {tab.count}
                </span>
              )}

              {/* Active underline */}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-fp-accent rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="p-5">
        {activeTab === 'updates'  && <UpdatesTab  project={project} />}
        {activeTab === 'files'    && <FilesTab    project={project} />}
        {activeTab === 'invoices' && <InvoicesTab project={project} />}
      </div>

    </div>
  )
}