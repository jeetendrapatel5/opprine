// components/dashboard/milestones/MilestoneRow.jsx
'use client'

import { useState } from 'react'
import {
  GripVertical, CheckCircle2, CircleDashed, ArrowRightCircle,
  Eye, Loader2, Trash2, ChevronDown, ChevronRight, MessageSquare,
  Send, Calendar
} from 'lucide-react'
import MilestoneUpdateFeed from './MilestoneUpdateFeed'
import MilestoneUpdateForm from './MilestoneUpdateForm'
import DeliveryModal from './DeliveryModal'
import axios from 'axios'

const statusStyles = {
  PENDING:     'bg-gray-100    text-gray-500    border-gray-200',
  IN_PROGRESS: 'bg-blue-50    text-blue-700    border-blue-200',
  IN_REVIEW:   'bg-amber-50   text-amber-700   border-amber-200 animate-pulse',
  COMPLETED:   'bg-emerald-50 text-emerald-700  border-emerald-200',
}

function StatusIcon({ status }) {
  if (status === 'COMPLETED')   return <CheckCircle2     className="w-5 h-5 text-emerald-600" />
  if (status === 'IN_PROGRESS') return <ArrowRightCircle className="w-5 h-5 text-orange-500" />
  if (status === 'IN_REVIEW')   return <Eye              className="w-5 h-5 text-amber-500" />
  return <CircleDashed className="w-5 h-5 text-gray-300" />
}

function SmallStatusIcon({ status }) {
  if (status === 'COMPLETED')   return <CheckCircle2     className="w-3 h-3" />
  if (status === 'IN_PROGRESS') return <ArrowRightCircle className="w-3 h-3" />
  if (status === 'IN_REVIEW')   return <Eye              className="w-3 h-3" />
  return <CircleDashed className="w-3 h-3" />
}

// Converts a JS Date or ISO string to "YYYY-MM-DD" format.
// WHY: The native <input type="date"> requires its value in exactly this format.
// If you pass an ISO string like "2025-09-01T00:00:00.000Z", the input
// won't display it correctly — you must strip it down to just the date part.
function toDateInputValue(date) {
  if (!date) return ''
  return new Date(date).toISOString().split('T')[0]
}

// Formats a date for display in the row — short and scannable.
// e.g. "Due 1 Sep" — no year because milestone dates are always near-future.
// If the date is in the past, we show "Overdue" in red.
function formatDueDateDisplay(date) {
  if (!date) return null
  const d       = new Date(date)
  const today   = new Date()
  today.setHours(0, 0, 0, 0)

  const isOverdue = d < today
  const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  return { label: `Due ${label}`, isOverdue }
}

export default function MilestoneRow({
  milestone,
  onStatusChange,
  onMilestoneUpdate,
  onDelete,
  isUpdating,
  isDeleting,
  freelancerName,
  clientName,
}) {
  const [isOpen,         setIsOpen]         = useState(false)
  const [localUpdates,   setLocalUpdates]   = useState(milestone.milestoneUpdates ?? [])
  const [isDeliveryOpen, setIsDeliveryOpen] = useState(false)

  // Due date — owned locally so the input feels instant.
  // Initialized from the milestone prop. When the freelancer changes it,
  // we update local state immediately AND call the API in the background.
  const [dueDate,       setDueDate]       = useState(milestone.dueDate ?? null)
  const [isDueSaving,   setIsDueSaving]   = useState(false)

  const messages = milestone.messages ?? []

  const handleNewUpdate = (newUpdate) => {
    setLocalUpdates(prev => [...prev, newUpdate])
  }

  const handleDeliverySuccess = (updatedMilestone) => {
    onMilestoneUpdate(updatedMilestone)
  }

  // Called when the freelancer picks a date from the input.
  // e.target.value is a "YYYY-MM-DD" string, or "" if they cleared it.
  const handleDueDateChange = async (e) => {
    const rawValue = e.target.value  // "2025-09-01" or ""

    // Update local state immediately — the input feels responsive
    const newDate = rawValue ? new Date(rawValue) : null
    setDueDate(newDate)

    setIsDueSaving(true)
    try {
      // Send to API — the route accepts dueDate as an ISO string or null
      // null = clear the due date
      await axios.patch(`/api/milestones/${milestone.id}`, {
        dueDate: rawValue || null,
      })
      // No need to call onMilestoneUpdate here — dueDate is display-only
      // in the parent list. Local state is enough.
    } catch {
      // If save fails, revert local state back to what it was before
      setDueDate(milestone.dueDate ?? null)
      alert('Could not save due date. Please try again.')
    } finally {
      setIsDueSaving(false)
    }
  }

  const totalItems   = localUpdates.length + messages.length
  const fileOptions  = localUpdates.filter(u => !!u.fileUrl)
  const dueDateDisplay = formatDueDateDisplay(dueDate)

  const hasUnresolvedFeedback =
    !!milestone.rejectionNote && milestone.status !== 'COMPLETED'

  return (
    <>
      <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">

        {/* ── Main row ──────────────────────────────────────────────────── */}
        <div className={`flex items-center gap-3 p-3 bg-gray-50 group ${isOpen ? 'border-b border-gray-100' : ''}`}>

          <GripVertical className="w-4 h-4 text-gray-300 cursor-grab shrink-0" />

          {/* Status icon */}
          <button
            onClick={() => onStatusChange(milestone.id, milestone.status)}
            disabled={isUpdating}
            className="hover:scale-110 transition-transform focus:outline-none shrink-0"
            title="Click to advance status"
          >
            {isUpdating
              ? <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
              : <StatusIcon status={milestone.status} />
            }
          </button>

          {/* Title + due date display */}
          <button
            onClick={() => setIsOpen(v => !v)}
            className="flex-1 text-left flex items-center gap-2 min-w-0"
          >
            <span className={`text-sm font-medium truncate ${
              milestone.status === 'COMPLETED' ? 'line-through text-gray-400' : 'text-gray-900'
            }`}>
              {milestone.title}
            </span>

            {/* Due date badge — shown in the row when a date is set */}
            {/* Small, muted, doesn't compete with the title */}
            {dueDateDisplay && milestone.status !== 'COMPLETED' && (
              <span className={`shrink-0 flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                dueDateDisplay.isOverdue
                  ? 'bg-red-50 text-red-500'      // overdue — red, urgent
                  : 'bg-gray-100 text-gray-500'   // upcoming — neutral
              }`}>
                <Calendar className="w-2.5 h-2.5" />
                {dueDateDisplay.label}
              </span>
            )}

            {totalItems > 0 && (
              <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                <MessageSquare className="w-2.5 h-2.5" />
                {totalItems}
              </span>
            )}

            <span className="ml-auto shrink-0 flex items-center gap-1.5">
              {hasUnresolvedFeedback && (
                <span
                  className="w-2 h-2 rounded-full bg-red-500 animate-pulse"
                  title="Client feedback waiting"
                />
              )}
              {isOpen
                ? <ChevronDown  className="w-3.5 h-3.5 text-gray-400" />
                : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              }
            </span>
          </button>

          {/* Send for Review button — only when IN_PROGRESS */}
          {milestone.status === 'IN_PROGRESS' && (
            <button
              onClick={() => setIsDeliveryOpen(true)}
              className="shrink-0 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              <Send className="w-3 h-3" />
              Send for Review
            </button>
          )}

          {/* Status badge — shown when NOT IN_PROGRESS */}
          {milestone.status !== 'IN_PROGRESS' && (
            <button
              disabled={isUpdating || milestone.status === 'COMPLETED'}
              onClick={() => onStatusChange(milestone.id, milestone.status)}
              className={`shrink-0 flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg border transition-all disabled:cursor-not-allowed ${statusStyles[milestone.status]}`}
            >
              <SmallStatusIcon status={milestone.status} />
              {milestone.status === 'IN_REVIEW' ? 'Awaiting Client' : milestone.status.replace('_', ' ')}
            </button>
          )}

          {/* Delete */}
          <button
            onClick={() => onDelete(milestone.id)}
            disabled={isDeleting}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 p-1 rounded shrink-0"
            title="Delete milestone"
          >
            {isDeleting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Trash2  className="w-4 h-4" />
            }
          </button>
        </div>

        {/* ── Expanded panel ────────────────────────────────────────────── */}
        {isOpen && (
          <div className="px-4 py-4 bg-white space-y-4">

            {/* Due date picker — sits at the top of the expanded panel */}
            {/* Compact, unobtrusive, but easy to find when you need it   */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 shrink-0">
                <Calendar className="w-3 h-3" />
                Due date
              </label>

              <div className="relative flex items-center">
                {/* Native date input — cross-browser, no library needed */}
                {/* Styled to look minimal, matching the rest of the UI   */}
                <input
                  type="date"
                  value={toDateInputValue(dueDate)}
                  onChange={handleDueDateChange}
                  disabled={isDueSaving}
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 disabled:opacity-50 cursor-pointer"
                />

                {/* Saving spinner — appears next to input while API call is in flight */}
                {isDueSaving && (
                  <Loader2 className="w-3 h-3 text-indigo-400 animate-spin ml-2" />
                )}
              </div>

              {/* Clear button — only shown when a date is already set */}
              {dueDate && !isDueSaving && (
                <button
                  type="button"
                  onClick={() => handleDueDateChange({ target: { value: '' } })}
                  className="text-[10px] text-gray-400 hover:text-red-400 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Conversation feed */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                Conversation
              </p>
              <MilestoneUpdateFeed
                updates={localUpdates}
                messages={messages}
                freelancerName={freelancerName}
                clientName={clientName}
              />
            </div>

            {/* New update form */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                Add Update
              </p>
              <MilestoneUpdateForm
                milestoneId={milestone.id}
                onSuccess={handleNewUpdate}
              />
            </div>

          </div>
        )}
      </div>

      {/* Delivery modal — outside row to avoid overflow:hidden clipping */}
      {isDeliveryOpen && (
        <DeliveryModal
          milestone={milestone}
          fileOptions={fileOptions}
          onSuccess={handleDeliverySuccess}
          onClose={() => setIsDeliveryOpen(false)}
        />
      )}
    </>
  )
}