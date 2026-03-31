// components/portal/ProjectMilestones.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The project timeline — the backbone of the client portal.
// Shows every milestone with its status, and when a milestone is IN_REVIEW,
// replaces the simple row with a full DeliveryCard for approve/reject.
//
// Architecture: DeliveryCard is defined in this file, not a separate file.
// It only exists in this context so keeping it co-located is correct.
//
// DESIGN — Portal theme (warm white), NOT dark:
// Timeline spine: fp-portal-border (subtle warm beige line)
// Completed node: filled amber circle — "✓ done, paid for, delivered"
// IN_PROGRESS node: pulsing amber — "being worked on right now"
// IN_REVIEW node: pulsing accent — "needs your eyes"
// PENDING node: empty circle — "coming soon"
//
// DeliveryCard design:
// - fp-portal-surface card with an amber top border — premium presentation
// - Fraunces headline — this is the "cover" of the deliverable
// - Checklist items are interactive checkboxes — amber when checked
// - Approve = fp-portal-success (green). Request Changes = ghost danger.
// ─────────────────────────────────────────────────────────────────────────────
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import {
  Loader2, XCircle, CheckCircle2,
  ChevronDown, ChevronUp, Download, Paperclip,
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(date) {
  if (!date) return ''
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60)    return 'just now'
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function formatSize(bytes) {
  if (!bytes)              return ''
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(date) {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Timeline nodes ────────────────────────────────────────────────────────────
// All nodes are w-6 h-6 (24px) — the spine sits at left: 11px (center of 24px)

function CompletedNode() {
  return (
    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-fp-portal-accent">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function InProgressNode() {
  return (
    <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
      <span className="absolute inline-flex w-full h-full rounded-full bg-fp-portal-accent opacity-20 animate-ping" />
      <span className="relative inline-flex w-3 h-3 rounded-full bg-fp-portal-accent" />
    </div>
  )
}

function InReviewNode() {
  return (
    // Faster pulse than IN_PROGRESS — "needs your action NOW"
    <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
      <span className="absolute inline-flex w-full h-full rounded-full bg-fp-portal-accent opacity-30 animate-ping" />
      <span className="relative inline-flex w-3 h-3 rounded-full bg-fp-portal-accent" />
    </div>
  )
}

function PendingNode() {
  return (
    <div className="w-6 h-6 rounded-full border-2 border-fp-portal-border bg-fp-portal-bg shrink-0" />
  )
}

// ── DeliveryCard ──────────────────────────────────────────────────────────────
// Shown in place of the simple text row when milestone.status === 'IN_REVIEW'

function DeliveryCard({ milestone, token }) {
  const router = useRouter()

  const [checkedItems,  setCheckedItems]  = useState(new Set())
  const [isWorkLogOpen, setIsWorkLogOpen] = useState(false)
  const [isRejecting,   setIsRejecting]   = useState(false)
  const [rejectReason,  setRejectReason]  = useState('')
  const [isLoading,     setIsLoading]     = useState(false)

  const checklist = milestone.deliveryChecklist ?? []
  const workLog   = milestone.milestoneUpdates  ?? []

  const toggleCheck = (index) => {
    setCheckedItems(prev => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })
  }

  const handleApprove = async () => {
    setIsLoading(true)
    try {
      await axios.patch(`/api/portal/${token}/approve`, {
        itemId: milestone.id,
        type:   'milestone',
        action: 'approve',
      })
      router.refresh()
    } catch {
      alert('Failed to approve. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please describe what needs to change.')
      return
    }
    setIsLoading(true)
    try {
      await axios.patch(`/api/portal/${token}/approve`, {
        itemId: milestone.id,
        type:   'milestone',
        action: 'reject',
        reason: rejectReason.trim(),
      })
      setIsRejecting(false)
      setRejectReason('')
      router.refresh()
    } catch {
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-fp-portal-surface border border-fp-portal-accent/25 rounded-xl overflow-hidden">
      {/* Amber top bar — "this card needs your attention" */}
      <div className="h-[2px] w-full bg-fp-portal-accent" />

      <div className="p-5">

        {/* Headline — Fraunces, this is the deliverable's "title" */}
        <h3 className="font-display text-lg font-medium text-fp-portal-text-primary mb-2 leading-snug">
          {milestone.deliveryHeadline ?? milestone.title}
        </h3>

        {/* Summary — plain language explanation */}
        {milestone.deliverySummary && (
          <p className="text-fp-portal-text-secondary text-sm leading-relaxed mb-4">
            {milestone.deliverySummary}
          </p>
        )}

        {/* File — image preview or download chip */}
        {milestone.deliveryFileUrl && (
          <div className="mb-4">
            {milestone.deliveryFileType?.startsWith('image/') ? (
              <a
                href={milestone.deliveryFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl overflow-hidden border border-fp-portal-border hover:opacity-90 transition-opacity"
              >
                <img
                  src={milestone.deliveryFileUrl}
                  alt={milestone.deliveryFileName ?? 'Deliverable'}
                  className="w-full max-h-64 object-cover"
                />
                <div className="px-3 py-2 bg-fp-portal-raised flex items-center gap-2 text-xs text-fp-portal-text-tertiary">
                  <Paperclip className="w-3 h-3" />
                  {milestone.deliveryFileName}
                  <span className="ml-auto">Click to view full size ↗</span>
                </div>
              </a>
            ) : (
              <a
                href={milestone.deliveryFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  flex items-center gap-3 rounded-xl
                  border border-fp-portal-border bg-fp-portal-raised
                  px-4 py-3
                  hover:border-fp-portal-accent/30
                  transition-colors duration-150
                "
              >
                <div className="w-9 h-9 rounded-lg bg-fp-portal-accent/10 flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4 text-fp-portal-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fp-portal-text-primary truncate">
                    {milestone.deliveryFileName ?? 'Download file'}
                  </p>
                  <p className="text-xs text-fp-portal-text-tertiary">
                    Click to open
                  </p>
                </div>
              </a>
            )}
          </div>
        )}

        {/* Checklist — interactive amber checkboxes */}
        {checklist.length > 0 && (
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-fp-portal-text-tertiary mb-3">
              Before you approve, please check:
            </p>
            <div className="space-y-2.5">
              {checklist.map((item, index) => {
                const isChecked = checkedItems.has(index)
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleCheck(index)}
                    className="w-full flex items-center gap-3 text-left group"
                  >
                    {/* Checkbox — fills amber when checked */}
                    <div className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center shrink-0
                      transition-all duration-150
                      ${isChecked
                        ? 'bg-fp-portal-accent border-fp-portal-accent'
                        : 'border-fp-portal-border group-hover:border-fp-portal-accent/50'
                      }
                    `}>
                      {isChecked && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className={`
                      text-sm transition-all duration-150
                      ${isChecked
                        ? 'text-fp-portal-text-tertiary line-through'
                        : 'text-fp-portal-text-primary'
                      }
                    `}>
                      {item}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Approve / Request Changes buttons */}
        {!isRejecting ? (
          <div className="flex gap-3">
            <button
              onClick={() => setIsRejecting(true)}
              disabled={isLoading}
              className="
                flex-1 flex items-center justify-center gap-2
                border border-fp-portal-border text-fp-portal-text-secondary
                text-sm font-semibold py-2.5 rounded-xl
                hover:border-fp-portal-danger/30 hover:text-fp-portal-danger
                transition-colors duration-150 disabled:opacity-50
              "
            >
              <XCircle className="w-4 h-4" />
              Request Changes
            </button>
            <button
              onClick={handleApprove}
              disabled={isLoading}
              className="
                flex-1 flex items-center justify-center gap-2
                bg-fp-portal-success hover:bg-fp-portal-success/80
                text-white text-sm font-bold py-2.5 rounded-xl
                transition-colors duration-150 disabled:opacity-50
              "
            >
              {isLoading
                ? <Loader2     className="w-4 h-4 animate-spin" />
                : <CheckCircle2 className="w-4 h-4" />
              }
              {isLoading ? 'Approving...' : 'Approve'}
            </button>
          </div>
        ) : (
          // Rejection form — inline
          <div className="bg-fp-portal-raised border border-fp-portal-border rounded-xl p-4">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-fp-portal-text-tertiary mb-2">
              What needs to change?
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. The colour scheme doesn't match our brand guidelines."
              rows={3}
              className="
                w-full bg-fp-portal-surface border border-fp-portal-border
                text-fp-portal-text-primary text-sm rounded-lg px-3 py-2.5
                placeholder:text-fp-portal-text-tertiary resize-none
                focus:outline-none focus:ring-2 focus:ring-fp-portal-accent/20
                focus:border-fp-portal-accent/40 transition-colors duration-150
              "
            />
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => { setIsRejecting(false); setRejectReason('') }}
                className="
                  flex-1 text-sm py-2 rounded-xl
                  border border-fp-portal-border text-fp-portal-text-secondary
                  hover:border-fp-portal-border/70 transition-colors duration-150
                "
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isLoading || !rejectReason.trim()}
                className="
                  flex-1 flex items-center justify-center gap-2
                  bg-fp-portal-danger hover:bg-fp-portal-danger/80
                  text-white text-sm font-bold py-2 rounded-xl
                  transition-colors duration-150 disabled:opacity-50
                "
              >
                {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Submit Feedback
              </button>
            </div>
          </div>
        )}

        {/* Work log toggle — collapsed by default, available for curious clients */}
        {workLog.length > 0 && (
          <div className="mt-4 pt-4 border-t border-fp-portal-border">
            <button
              type="button"
              onClick={() => setIsWorkLogOpen(v => !v)}
              className="
                flex items-center gap-2 text-xs font-semibold
                text-fp-portal-text-tertiary hover:text-fp-portal-text-secondary
                transition-colors duration-150
              "
            >
              {isWorkLogOpen
                ? <ChevronUp   className="w-3.5 h-3.5" />
                : <ChevronDown className="w-3.5 h-3.5" />
              }
              {isWorkLogOpen ? 'Hide' : 'View'} work log ({workLog.length} {workLog.length === 1 ? 'entry' : 'entries'})
            </button>

            {isWorkLogOpen && (
              <div className="mt-3 space-y-3">
                {workLog.map((entry) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-fp-portal-accent/40 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-fp-portal-text-secondary leading-relaxed">
                        {entry.note}
                      </p>
                      {entry.fileUrl && (
                        <a
                          href={entry.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="
                            inline-flex items-center gap-1.5 mt-1.5 text-xs
                            text-fp-portal-accent hover:underline
                          "
                        >
                          <Paperclip className="w-3 h-3" />
                          {entry.fileName}
                          {entry.fileSize && (
                            <span className="text-fp-portal-text-tertiary">
                              {formatSize(entry.fileSize)}
                            </span>
                          )}
                        </a>
                      )}
                      <p className="text-[10px] text-fp-portal-text-tertiary mt-0.5">
                        {timeAgo(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ProjectMilestones({ milestones, freelancerName, clientName, token }) {
  if (!milestones || milestones.length === 0) return null

  const completedCount     = milestones.filter(m => m.status === 'COMPLETED').length
  const progressPercentage = Math.round((completedCount / milestones.length) * 100)

  return (
    <div className="bg-fp-portal-surface border border-fp-portal-border rounded-xl p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-fp-portal-text-primary text-sm font-semibold">
          Project Timeline
        </h2>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-fp-portal-accent/10 text-fp-portal-accent">
          {progressPercentage}% Complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-fp-portal-raised rounded-full h-1.5 mb-7">
        <div
          className="h-1.5 rounded-full transition-all duration-700 bg-fp-portal-accent"
          style={{ width: `${Math.max(progressPercentage, 3)}%` }}
        />
      </div>

      {/* Timeline
          HOW THE SPINE WORKS:
          Each row is flex [node 24px][content]. The spine is a single absolute
          line at left: 11px (center of 24px node). The node wrapper has
          bg-fp-portal-surface to visually "cut" the spine behind hollow nodes.
      */}
      <div className="relative">
        {milestones.length > 1 && (
          <div
            className="absolute top-3 bottom-3 w-px bg-fp-portal-border"
            style={{ left: '11px' }}
          />
        )}

        <div className="space-y-7">
          {milestones.map((milestone) => {
            const isCompleted  = milestone.status === 'COMPLETED'
            const isInProgress = milestone.status === 'IN_PROGRESS'
            const isInReview   = milestone.status === 'IN_REVIEW'
            const isPending    = milestone.status === 'PENDING'

            return (
              <div key={milestone.id} className="relative flex gap-4">

                {/* Node — sits on the spine, bg matches card to clip the line */}
                <div className="relative z-10 mt-0.5 shrink-0 bg-fp-portal-surface">
                  {isCompleted  && <CompletedNode  />}
                  {isInProgress && <InProgressNode />}
                  {isInReview   && <InReviewNode   />}
                  {isPending    && <PendingNode     />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {isInReview ? (
                    <DeliveryCard milestone={milestone} token={token} />
                  ) : (
                    <div className="pt-0.5">
                      <p className={`
                        text-sm font-medium leading-snug
                        ${isCompleted  ? 'line-through text-fp-portal-text-tertiary' : ''}
                        ${isInProgress ? 'text-fp-portal-text-primary' : ''}
                        ${isPending    ? 'text-fp-portal-text-tertiary' : ''}
                      `}>
                        {milestone.title}
                      </p>

                      {isCompleted && (
                        <p className="text-xs text-fp-portal-accent mt-0.5 font-medium">
                          ✓ Approved
                          {milestone.completedAt && ` · ${formatDate(milestone.completedAt)}`}
                        </p>
                      )}

                      {isInProgress && (
                        <p className="text-xs text-fp-portal-text-tertiary mt-0.5">
                          Currently being worked on
                        </p>
                      )}

                      {isPending && (
                        <p className="text-xs text-fp-portal-text-tertiary mt-0.5">
                          {milestone.dueDate
                            ? `Due ${formatDate(milestone.dueDate)}`
                            : 'Not started yet'
                          }
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}