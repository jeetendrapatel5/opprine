'use client'

import { useState } from 'react'
import { MessageSquare, FileText, Receipt } from 'lucide-react'
import UpdatesTab  from './UpdatesTab'
import FilesTab    from './FilesTab'
import InvoicesTab from '@/components/dashboard/invoices/InvoicesTab'

// NEW — fail-closed default, same as every other component that
// reads a `permissions` prop this session. If this is ever rendered
// without one, no invoice tab shows up — the safer mistake to make.
const DEFAULT_PERMISSIONS = {
  canViewInvoices: false,
  canCreateInvoices: false,
  canEditInvoices: false,
}

export default function ProjectTabs({ project, permissions = DEFAULT_PERMISSIONS }) {
  const [activeTab, setActiveTab] = useState('updates')

  // CHANGED — the invoices tab entry is now built conditionally and
  // only added to the array when permissions.canViewInvoices is true.
  // This isn't just "hide it in the UI": for a Contributor,
  // project.invoices was never even fetched (see the include:
  // { invoices: canViewInvoices ? {...} : false } in the parent page),
  // so tab.count would be reading `undefined?.length ?? 0` anyway —
  // but skipping the tab entirely, rather than showing an always-empty
  // "Invoices (0)" tab, is the honest version: a Contributor shouldn't
  // be able to tell from this UI whether the project even HAS
  // invoices.
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
    permissions.canViewInvoices && {
      id:    'invoices',
      label: 'Invoices',
      icon:  Receipt,
      count: project.invoices?.length ?? 0,
    },
  ].filter(Boolean)

  // NEW — defensive: if activeTab somehow points at a tab that just
  // got filtered out (e.g. a Contributor had this open in a previous
  // session before their role changed, and the tab state persisted
  // somewhere), fall back to 'updates' instead of rendering a blank
  // panel with no active tab highlighted.
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : 'updates'

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center border-b border-fp-border px-5">
        {tabs.map((tab) => {
          const Icon     = tab.icon
          const isActive = currentTab === tab.id
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

      {/* Tab content — permissions forwarded to every tab. UpdatesTab
          and FilesTab aren't part of this upload, so they don't
          consume it yet, but the shape is here for when they do
          (e.g. FilesTab will eventually want canUploadFiles /
          canManageFiles for its own upload/delete buttons). */}
      <div className="p-5">
        {currentTab === 'updates'  && <UpdatesTab  project={project} permissions={permissions} />}
        {currentTab === 'files'    && <FilesTab    project={project} permissions={permissions} />}
        {currentTab === 'invoices' && permissions.canViewInvoices && (
          <InvoicesTab project={project} permissions={permissions} />
        )}
      </div>

    </div>
  )
}