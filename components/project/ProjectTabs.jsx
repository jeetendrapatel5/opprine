// components/project/ProjectTabs.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Tab navigation container for the lower-left section of the project page.
// Three tabs: Updates (project-level log), Files (deliverables), Invoices.
//
// Design: The active tab underline uses bg-fp-accent (periwinkle-indigo).
// Inactive tabs use fp-text-tertiary — muted, not absent. They should be
// readable without competing with the active tab.
//
// The tab bar has no left/right padding on the buttons — the underline extends
// to the full button width, which feels more intentional than a short underline
// centered under the text.
// ─────────────────────────────────────────────────────────────────────────────
'use client'

import { useState } from 'react'
import { MessageSquare, FileText, Receipt } from 'lucide-react'
import UpdatesTab  from './UpdatesTab'
import FilesTab    from './FilesTab'
import InvoicesTab from '@/components/dashboard/invoices/InvoicesTab'

export default function ProjectTabs({ project }) {
  const [activeTab, setActiveTab] = useState('updates')

  const tabs = [
    { id: 'updates',  label: 'Updates',      icon: MessageSquare },
    { id: 'files',    label: 'Deliverables', icon: FileText      },
    { id: 'invoices', label: 'Invoices',     icon: Receipt       },
  ]

  return (
    <div>

      {/* ── Tab bar ── */}
      {/* border-b separates the nav from content — provides structure */}
      <div className="flex items-center px-5">
        {tabs.map((tab) => {
          const Icon     = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative flex items-center gap-2 py-3.5 px-3 mr-2
                text-xs font-semibold transition-colors duration-150
                ${isActive
                  ? 'text-fp-accent'
                  : 'text-fp-text-tertiary hover:text-fp-text-secondary'
                }
              `}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}

              {/* Active underline — the accent color indicator */}
              {/* absolute bottom-0 so it sits flush on the border-b of the bar */}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-fp-accent rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Tab content ── */}
      <div className="p-5">
        {activeTab === 'updates'  && <UpdatesTab  project={project} />}
        {activeTab === 'files'    && <FilesTab    project={project} />}
        {activeTab === 'invoices' && <InvoicesTab project={project} />}
      </div>

    </div>
  )
}