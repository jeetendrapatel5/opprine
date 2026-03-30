// components/dashboard/milestones/MilestoneRow.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The most-used component in the entire freelancer experience.
// Every project has milestones. The freelancer looks at this daily.
//
// Anatomy:
//   Collapsed: [grip] [status icon] [title] [due date] [item count] [action btn] [delete]
//   Expanded:  Adds due date picker → conversation feed → update form
//
// Status visual system (mapped to fp tokens):
//   PENDING      → neutral (border, tertiary text)
//   IN_PROGRESS  → accent (indigo tint)
//   IN_REVIEW    → warning (amber) + animate-pulse on badge to signal urgency
//   COMPLETED    → success (green) + line-through title
//
// The "Send for Review" button only appears when status is IN_PROGRESS.
// When IN_REVIEW, the badge says "Awaiting Client" with an amber pulse.
// When COMPLETED, the badge is static green — no further action possible.
//
// Rejection note: if a client rejected a milestone and the status is not yet
// COMPLETED, a red pulsing dot appears on the row — the attention hook.
// ─────────────────────────────────────────────────────────────────────────────
'use client'

import { useState } from 'react'
import {
  GripVertical, CheckCircle2, CircleDashed, ArrowRightCircle,
  Eye, Loader2, Trash2, ChevronDown, ChevronRight, MessageSquare,
  Send, Calendar,
} from 'lucide-react'
import MilestoneUpdateFeed from './MilestoneUpdateFeed'
import MilestoneUpdateForm from './MilestoneUpdateForm'
import DeliveryModal       from './DeliveryModal'
import axios from 'axios'

// Status badge styles — collapsed row badge (not the icon)
const statusBadgeStyles = {
  PENDING:     'bg-fp-border/50 text-fp-text-tertiary border-fp-border',
  IN_PROGRESS: 'bg-fp-accent-muted text-fp-accent border-fp-accent/20',
  IN_REVIEW:   'bg-fp-warning/10 text-fp-warning border-fp-warning/20',
  COMPLETED:   'bg-fp-success/10 text-fp-success border-fp-success/20',
}

// The icon shown next to or instead of the status badge
function StatusIcon({ status }) {
  if (status === 'COMPLETED')   return <CheckCircle2     className="w-4 h-4 text-fp-success" />
  if (status === 'IN_PROGRESS') return <ArrowRightCircle className="w-4 h-4 text-fp-accent" />
  if (status === 'IN_REVIEW')   return <Eye              className="w-4 h-4 text-fp-warning" />
  return <CircleDashed className="w-4 h-4 text-fp-text-tertiary" />
}

// Smaller version of StatusIcon used inside the badge pill
function SmallStatusIcon({ status }) {
  if (status === 'COMPLETED')   return <CheckCircle2     className="w-3 h-3" />
  if (status === 'IN_PROGRESS') return <ArrowRightCircle className="w-3 h-3" />
  if (status === 'IN_REVIEW')   return <Eye              className="w-3 h-3" />
  return <CircleDashed className="w-3 h-3" />
}

// Converts a JS Date or ISO string → "YYYY-MM-DD" for <input type="date">
function toDateInputValue(date) {
  if (!date) return ''
  return new Date(date).toISOString().split('T')[0]
}

// Returns display label and whether the date is in the past
function formatDueDateDisplay(date) {
  if (!date) return null
  const d     = new Date(date)
  const today = new Date()
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
  const [isOpen,          setIsOpen]         = useState(false)
  const [localUpdates,    setLocalUpdates]   = useState(milestone.milestoneUpdates ?? [])
  const [isDeliveryOpen,  setIsDeliveryOpen] = useState(false)
  const [dueDate,         setDueDate]        = useState(milestone.dueDate ?? null)
  const [isDueSaving,     setIsDueSaving]    = useState(false)

  const messages        = milestone.messages ?? []
  const totalItems      = localUpdates.length + messages.length
  const fileOptions     = localUpdates.filter(u => !!u.fileUrl)
  const dueDateDisplay  = formatDueDateDisplay(dueDate)
  const hasUnresolved   = !!milestone.rejectionNote && milestone.status !== 'COMPLETED'

  const handleNewUpdate = (newUpdate) => {
    setLocalUpdates(prev => [...prev, newUpdate])
  }

  const handleDeliverySuccess = (updatedMilestone) => {
    onMilestoneUpdate(updatedMilestone)
  }

  const handleDueDateChange = async (e) => {
    const rawValue = e.target.value
    const newDate  = rawValue ? new Date(rawValue) : null
    setDueDate(newDate)
    setIsDueSaving(true)
    try {
      await axios.patch(`/api/milestones/${milestone.id}`, {
        dueDate: rawValue || null,
      })
    } catch {
      setDueDate(milestone.dueDate ?? null)
      alert('Could not save due date.')
    } finally {
      setIsDueSaving(false)
    }
  }

  return (
    <>
      <div className="rounded-xl border border-fp-border overflow-hidden">

        {/* ── Collapsed row ── */}
        <div className={`
          flex items-center gap-2.5 px-3 py-2.5 bg-fp-raised group
          ${isOpen ? 'border-b border-fp-border' : ''}
        `}>

          {/* Drag handle — visual affordance for future drag-to-reorder */}
          <GripVertical className="w-4 h-4 text-fp-text-tertiary cursor-grab shrink-0" />

          {/* Status icon — clickable to advance status */}
          <button
            onClick={() => onStatusChange(milestone.id, milestone.status)}
            disabled={isUpdating}
            className="hover:scale-110 transition-transform duration-150 focus:outline-none shrink-0"
            title="Click to advance status"
          >
            {isUpdating
              ? <Loader2 className="w-4 h-4 text-fp-accent animate-spin" />
              : <StatusIcon status={milestone.status} />
            }
          </button>

          {/* Title row — expands the panel on click */}
          <button
            onClick={() => setIsOpen(v => !v)}
            className="flex-1 text-left flex items-center gap-2 min-w-0"
          >
            {/* Milestone title */}
            <span className={`
              text-sm font-medium truncate leading-snug
              ${milestone.status === 'COMPLETED'
                ? 'line-through text-fp-text-tertiary'
                : 'text-fp-text-primary'
              }
            `}>
              {milestone.title}
            </span>

            {/* Due date badge — only shown when date is set and not completed */}
            {dueDateDisplay && milestone.status !== 'COMPLETED' && (
              <span className={`
                shrink-0 flex items-center gap-1
                text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                ${dueDateDisplay.isOverdue
                  ? 'bg-fp-danger/10 text-fp-danger'
                  : 'bg-fp-border/50 text-fp-text-tertiary'
                }
              `}>
                <Calendar className="w-2.5 h-2.5" />
                {dueDateDisplay.label}
              </span>
            )}

            {/* Item count badge — updates + client messages combined */}
            {totalItems > 0 && (
              <span className="
                shrink-0 flex items-center gap-1
                text-[10px] font-bold text-fp-accent bg-fp-accent-muted
                px-1.5 py-0.5 rounded-full
              ">
                <MessageSquare className="w-2.5 h-2.5" />
                {totalItems}
              </span>
            )}

            {/* Right cluster: rejection dot + chevron */}
            <span className="ml-auto shrink-0 flex items-center gap-2">
              {hasUnresolved && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-fp-danger animate-pulse"
                  title="Client feedback waiting"
                />
              )}
              {isOpen
                ? <ChevronDown  className="w-3.5 h-3.5 text-fp-text-tertiary" />
                : <ChevronRight className="w-3.5 h-3.5 text-fp-text-tertiary" />
              }
            </span>
          </button>

          {/* "Send for Review" — primary action, only when IN_PROGRESS */}
          {milestone.status === 'IN_PROGRESS' && (
            <button
              onClick={() => setIsDeliveryOpen(true)}
              className="
                shrink-0 flex items-center gap-1.5
                bg-fp-accent hover:bg-fp-accent-hover text-fp-base
                text-[10px] font-bold uppercase tracking-wider
                px-2.5 py-1.5 rounded-lg transition-colors duration-150
              "
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
              className={`
                shrink-0 flex items-center gap-1.5
                text-[10px] font-bold uppercase tracking-wider
                px-2.5 py-1.5 rounded-lg border transition-all duration-150
                disabled:cursor-not-allowed
                ${statusBadgeStyles[milestone.status]}
                ${milestone.status === 'IN_REVIEW' ? 'animate-pulse' : ''}
              `}
            >
              <SmallStatusIcon status={milestone.status} />
              {milestone.status === 'IN_REVIEW'
                ? 'Awaiting Client'
                : milestone.status.replace('_', ' ')
              }
            </button>
          )}

          {/* Delete — hidden by default, revealed on row hover */}
          <button
            onClick={() => onDelete(milestone.id)}
            disabled={isDeleting}
            className="
              opacity-0 group-hover:opacity-100 transition-opacity duration-150
              text-fp-text-tertiary hover:text-fp-danger
              p-1 rounded shrink-0
            "
            title="Delete milestone"
          >
            {isDeleting
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Trash2  className="w-3.5 h-3.5" />
            }
          </button>

        </div>

        {/* ── Expanded panel ── */}
        {isOpen && (
          <div className="px-4 py-4 bg-fp-surface space-y-4">

            {/* Due date picker */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-fp-text-tertiary shrink-0">
                <Calendar className="w-3 h-3" />
                Due date
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={toDateInputValue(dueDate)}
                  onChange={handleDueDateChange}
                  disabled={isDueSaving}
                  className="
                    text-xs bg-fp-raised border border-fp-border text-fp-text-secondary
                    rounded-lg px-2.5 py-1.5
                    focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/50
                    disabled:opacity-50 cursor-pointer
                    transition-colors duration-150
                  "
                />
                {isDueSaving && (
                  <Loader2 className="w-3 h-3 text-fp-accent animate-spin" />
                )}
                {dueDate && !isDueSaving && (
                  <button
                    type="button"
                    onClick={() => handleDueDateChange({ target: { value: '' } })}
                    className="text-[10px] text-fp-text-tertiary hover:text-fp-danger transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="border-t border-fp-border" />

            {/* Conversation feed */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-fp-text-tertiary mb-3">
                Conversation
              </p>
              <MilestoneUpdateFeed
                updates={localUpdates}
                messages={messages}
                freelancerName={freelancerName}
                clientName={clientName}
              />
            </div>

            {/* Add update form */}
            <div className="border-t border-fp-border pt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-fp-text-tertiary mb-2">
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

      {/* DeliveryModal — outside the row to avoid overflow:hidden clipping */}
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