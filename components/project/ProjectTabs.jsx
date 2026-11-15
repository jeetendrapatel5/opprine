'use client'

import { useState } from 'react'
import { MessageSquare, FileText, Receipt } from 'lucide-react'
import UpdatesTab from './UpdatesTab'
import FilesTab from './FilesTab'
import InvoicesTab from '@/components/dashboard/invoices/InvoicesTab'

// Fail-closed: without a permissions prop, the Invoices tab stays hidden.
const DEFAULT_PERMISSIONS = {
  canViewInvoices: false,
  canCreateInvoices: false,
  canEditInvoices: false,
}

function TabButton({ tab, isActive, onSelect }) {
  const Icon = tab.icon
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${tab.id}`}
      aria-selected={isActive}
      aria-controls={`panel-${tab.id}`}
      onClick={() => onSelect(tab.id)}
      className={`relative flex shrink-0 items-center gap-2 px-3 py-3.5 text-xs font-semibold whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fp-accent/50 ${
        isActive
          ? 'text-fp-accent'
          : 'text-fp-text-tertiary hover:text-fp-text-secondary'
      }`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {tab.label}
      {tab.count > 0 && (
        <span className="text-[11px] font-medium tabular-nums opacity-70">
          {tab.count}
        </span>
      )}
      {isActive && (
        <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-fp-accent" />
      )}
    </button>
  )
}

export default function ProjectTabs({ project, permissions = DEFAULT_PERMISSIONS }) {
  const [activeTab, setActiveTab] = useState('updates')

  // The Invoices tab is omitted entirely (not just disabled) when the user
  // can't view invoices, so a contributor can't tell whether any exist.
  const tabs = [
    { id: 'updates', label: 'Updates', icon: MessageSquare, count: project.updates?.length ?? 0 },
    { id: 'files', label: 'Deliverables', icon: FileText, count: project.files?.length ?? 0 },
    permissions.canViewInvoices && {
      id: 'invoices',
      label: 'Invoices',
      icon: Receipt,
      count: project.invoices?.length ?? 0,
    },
  ].filter(Boolean)

  // Falls back to Updates if the stored tab was filtered out (e.g. role change).
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : 'updates'

  return (
    <div>
      <div
        role="tablist"
        aria-label="Project activity"
        className="flex items-center overflow-x-auto border-b border-fp-border px-2 sm:px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={currentTab === tab.id}
            onSelect={setActiveTab}
          />
        ))}
      </div>

      <div
        role="tabpanel"
        id={`panel-${currentTab}`}
        aria-labelledby={`tab-${currentTab}`}
        className="p-4 sm:p-5"
      >
        {currentTab === 'updates' && <UpdatesTab project={project} permissions={permissions} />}
        {currentTab === 'files' && <FilesTab project={project} permissions={permissions} />}
        {currentTab === 'invoices' && permissions.canViewInvoices && (
          <InvoicesTab project={project} permissions={permissions} />
        )}
      </div>
    </div>
  )
}