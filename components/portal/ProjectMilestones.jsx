// components/portal/ProjectMilestones.jsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Loader2, XCircle, CheckCircle, ChevronDown, ChevronUp, Download, Paperclip } from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date) {
  if (!date) return ''
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60)    return 'just now'
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Formats a date for display on the timeline.
// e.g. "12 Sep 2025"
function formatDate(date) {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-GB', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  })
}

// ── Timeline node components ──────────────────────────────────────────────────
// Each status gets its own node component.
// All nodes are 24x24px (w-6 h-6) so the spine line always aligns correctly.
// The spine is a vertical line positioned at left-3 (12px from left edge),
// which is exactly the center of a 24px node.

function CompletedNode() {
  return (
    // Filled amber circle with a white checkmark inside
    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
      style={{ background: '#F59E0B' }}
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
        <path
          d="M2 6l3 3 5-5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

function InProgressNode() {
  return (
    // Pulsing blue circle — same pattern as CurrentlyWorkingOn component
    // The outer ring animates (ping), the inner dot stays solid
    <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
      <span
        className="absolute inline-flex w-full h-full rounded-full opacity-20 animate-ping"
        style={{ background: '#3b82f6' }}
      />
      <span
        className="relative inline-flex w-3 h-3 rounded-full"
        style={{ background: '#3b82f6' }}
      />
    </div>
  )
}

function InReviewNode() {
  return (
    // Pulsing amber circle — signals "your action needed"
    <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
      <span
        className="absolute inline-flex w-full h-full rounded-full opacity-20 animate-ping"
        style={{ background: '#F59E0B' }}
      />
      <span
        className="relative inline-flex w-3 h-3 rounded-full"
        style={{ background: '#F59E0B' }}
      />
    </div>
  )
}

function PendingNode() {
  return (
    // Empty circle with a dark border — not started, no action needed
    <div
      className="w-6 h-6 rounded-full shrink-0 border-2"
      style={{ borderColor: '#1f2937', background: '#0e0e12' }}
    />
  )
}

// ── DeliveryCard ──────────────────────────────────────────────────────────────
// Shown when milestone.status === 'IN_REVIEW'.
// Full card with headline, summary, checklist, file, and approve/reject.

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
    <div
      className="rounded-2xl border border-amber-500/20 overflow-hidden"
      style={{ background: '#0e0e12' }}
    >
      <div className="h-0.5 w-full bg-gradient-to-r from-amber-500 to-amber-400/30" />

      <div className="p-5">

        {/* Headline */}
        <h3
          className="text-lg font-bold text-white mb-2 leading-snug"
          style={{ fontFamily: 'Fraunces, Georgia, serif' }}
        >
          {milestone.deliveryHeadline ?? milestone.title}
        </h3>

        {/* Summary */}
        {milestone.deliverySummary && (
          <p
            className="text-sm leading-relaxed mb-4"
            style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif' }}
          >
            {milestone.deliverySummary}
          </p>
        )}

        {/* File */}
        {milestone.deliveryFileUrl && (
          <div className="mb-4">
            {milestone.deliveryFileType?.startsWith('image/') ? (
              
              <a href={milestone.deliveryFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl overflow-hidden border border-white/5 hover:opacity-90 transition-opacity"
              >
                <img
                  src={milestone.deliveryFileUrl}
                  alt={milestone.deliveryFileName ?? 'Deliverable'}
                  className="w-full max-h-64 object-cover"
                />
                <div
                  className="px-3 py-2 text-xs flex items-center gap-2"
                  style={{ color: '#6b7280', fontFamily: 'DM Mono, monospace' }}
                >
                  <Paperclip className="w-3 h-3" />
                  {milestone.deliveryFileName}
                  <span className="ml-auto">Click to view full size ↗</span>
                </div>
              </a>
            ) : (
              
              <a href={milestone.deliveryFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3 hover:border-amber-500/40 transition-colors"
                style={{ background: '#16161a' }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: '#F59E0B22' }}
                >
                  <Download className="w-4 h-4" style={{ color: '#F59E0B' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {milestone.deliveryFileName ?? 'Download file'}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: '#6b7280', fontFamily: 'DM Mono, monospace' }}
                  >
                    Click to open
                  </p>
                </div>
              </a>
            )}
          </div>
        )}

        {/* Checklist */}
        {checklist.length > 0 && (
          <div className="mb-4">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3"
              style={{ color: '#6b7280', fontFamily: 'DM Mono, monospace' }}
            >
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
                    <div className={`
                      w-5 h-5 rounded flex items-center justify-center shrink-0
                      border-2 transition-all duration-150
                      ${isChecked
                        ? 'bg-amber-500 border-amber-500'
                        : 'border-white/20 group-hover:border-amber-500/50'
                      }
                    `}>
                      {isChecked && (
                        <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 12 12">
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <span
                      className="text-sm transition-colors"
                      style={{
                        color:      isChecked ? '#6b7280' : '#e5e7eb',
                        textDecoration: isChecked ? 'line-through' : 'none',
                        fontFamily: 'DM Sans, sans-serif',
                      }}
                    >
                      {item}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Approve / Request Changes */}
        {!isRejecting ? (
          <div className="flex gap-3">
            <button
              onClick={() => setIsRejecting(true)}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 border border-white/10 text-sm font-semibold py-2.5 rounded-xl transition-all hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
              style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif' }}
            >
              <XCircle className="w-4 h-4" />
              Request Changes
            </button>
            <button
              onClick={handleApprove}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 text-sm font-bold py-2.5 rounded-xl transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              {isLoading
                ? <Loader2    className="w-4 h-4 animate-spin" />
                : <CheckCircle className="w-4 h-4" />
              }
              {isLoading ? 'Approving...' : 'Approve'}
            </button>
          </div>
        ) : (
          <div
            className="rounded-xl border border-white/10 p-4"
            style={{ background: '#16161a' }}
          >
            <label
              className="block text-xs font-bold uppercase tracking-wide mb-2"
              style={{ color: '#9ca3af', fontFamily: 'DM Mono, monospace' }}
            >
              What needs to change?
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. The colour scheme doesn't match our brand guidelines."
              rows={3}
              className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-none border border-white/10 focus:border-amber-500/50"
              style={{
                background: '#0e0e12',
                color: '#e5e7eb',
                fontFamily: 'DM Sans, sans-serif',
              }}
            />
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => { setIsRejecting(false); setRejectReason('') }}
                className="flex-1 text-sm py-2 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
                style={{ color: '#9ca3af' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isLoading || !rejectReason.trim()}
                className="flex-1 flex items-center justify-center gap-2 text-sm font-bold py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit Feedback
              </button>
            </div>
          </div>
        )}

        {/* Work log toggle */}
        {workLog.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={() => setIsWorkLogOpen(v => !v)}
              className="flex items-center gap-2 text-xs font-semibold transition-colors hover:text-white"
              style={{ color: '#6b7280', fontFamily: 'DM Mono, monospace' }}
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
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{ background: '#F59E0B40' }}
                    />
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed" style={{ color: '#d1d5db' }}>
                        {entry.note}
                      </p>
                      {entry.fileUrl && (
                        
                        <a href={entry.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-1.5 text-xs hover:underline"
                          style={{ color: '#F59E0B' }}
                        >
                          <Paperclip className="w-3 h-3" />
                          {entry.fileName}
                          {entry.fileSize && (
                            <span style={{ color: '#6b7280' }}>
                              {formatSize(entry.fileSize)}
                            </span>
                          )}
                        </a>
                      )}
                      <p
                        className="text-[10px] mt-0.5"
                        style={{ color: '#6b7280', fontFamily: 'DM Mono, monospace' }}
                      >
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
    <div
      className="rounded-2xl border border-white/5 p-6 shadow-sm"
      style={{ background: '#0e0e12' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2
          className="text-base font-semibold text-white"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          Project Timeline
        </h2>
        <span
          className="text-sm font-medium px-3 py-1 rounded-full"
          style={{
            background:  '#F59E0B18',
            color:       '#F59E0B',
            fontFamily:  'DM Mono, monospace',
          }}
        >
          {progressPercentage}% Complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full rounded-full h-2 mb-8" style={{ background: '#ffffff08' }}>
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{
            width:      `${progressPercentage}%`,
            background: 'linear-gradient(90deg, #F59E0B, #FBBF24)',
          }}
        />
      </div>

      {/* ── Timeline ── */}
      {/*
        HOW THE SPINE WORKS:
        Each milestone row is a flex container: [node][content]
        The node is always w-6 (24px).
        The spine is a single absolutely-positioned vertical line
        running the full height of the list container, at left: 11px
        (which is exactly the center of 24px = 12px, minus 1px for
        the line's own 2px width = 11px).
        WHY absolute instead of per-row borders:
        Per-row borders create gaps between rows and are hard to control
        when some rows are taller (like the delivery card). One absolute
        line runs cleanly behind everything.
      */}
      <div className="relative">

        {/* The spine — runs full height behind all milestone nodes */}
        {milestones.length > 1 && (
          <div
            className="absolute top-3 bottom-3 w-px"
            style={{ left: '11px', background: '#ffffff08' }}
          />
        )}

        <div className="space-y-8">
          {milestones.map((milestone) => {
            const isCompleted  = milestone.status === 'COMPLETED'
            const isInProgress = milestone.status === 'IN_PROGRESS'
            const isInReview   = milestone.status === 'IN_REVIEW'
            const isPending    = milestone.status === 'PENDING'

            return (
              <div key={milestone.id} className="relative flex gap-4">

                {/* ── Node — always renders, always w-6 h-6 ── */}
                {/*
                  The node sits on top of the spine (z-10).
                  Its background matches the card background so it
                  visually "cuts" the spine line cleanly.
                  Without the background, the spine line would show
                  through the center of hollow nodes.
                */}
                <div className="relative z-10 mt-0.5 shrink-0" style={{ background: '#0e0e12' }}>
                  {isCompleted  && <CompletedNode  />}
                  {isInProgress && <InProgressNode />}
                  {isInReview   && <InReviewNode   />}
                  {isPending    && <PendingNode     />}
                </div>

                {/* ── Content — everything to the right of the node ── */}
                <div className="flex-1 min-w-0">

                  {isInReview ? (
                    // IN_REVIEW — full delivery card replaces the text row
                    <DeliveryCard
                      milestone={milestone}
                      token={token}
                    />
                  ) : (
                    // All other statuses — simple text row
                    <div className="pt-0.5">
                      <p
                        className={`text-sm font-medium leading-snug ${
                          isCompleted  ? 'line-through opacity-40 text-white' :
                          isInProgress ? 'text-white' :
                          'text-gray-600'
                        }`}
                        style={{ fontFamily: 'DM Sans, sans-serif' }}
                      >
                        {milestone.title}
                      </p>

                      {/* Sub-label under each title */}
                      {isCompleted && milestone.completedAt && (
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: '#F59E0B', fontFamily: 'DM Mono, monospace' }}
                        >
                          ✓ Approved · {formatDate(milestone.completedAt)}
                        </p>
                      )}

                      {isCompleted && !milestone.completedAt && (
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: '#F59E0B', fontFamily: 'DM Mono, monospace' }}
                        >
                          ✓ Approved
                        </p>
                      )}

                      {isInProgress && (
                        <p className="text-xs text-blue-400 mt-0.5 font-medium">
                          Currently being worked on
                        </p>
                      )}

                      {isPending && (
                        <p
                          className="text-xs mt-0.5"
                          style={{
                            color:      milestone.dueDate ? '#6b7280' : '#374151',
                            fontFamily: 'DM Mono, monospace',
                          }}
                        >
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