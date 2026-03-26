// components/portal/ProjectMilestones.jsx
'use client'

// WHY 'use client':
// The delivery card has two interactive pieces that require React state:
//   1. Checklist checkboxes — client checks them off locally before approving
//   2. Approve / Request Changes buttons — call the API, need loading state
// Server components cannot have useState or call event handlers.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import {
  CheckCircle2, CircleDashed, ArrowRightCircle, Eye,
  Loader2, XCircle, CheckCircle, ChevronDown, ChevronUp,
  Download, Paperclip
} from 'lucide-react'

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

// ── DeliveryCard ─────────────────────────────────────────────────────────────
// Rendered only when a milestone is IN_REVIEW.
// Replaces the flat timeline row entirely.
//
// Props:
//   milestone  — the full milestone object, must have delivery card fields
//   token      — the client's magic token, used to call the approve route
//   clientName — shown on the rejection feedback label
//
// State this component owns:
//   checkedItems  — Set of checklist indices the client has ticked
//   isWorkLogOpen — whether the "View work log" toggle is expanded
//   isRejecting   — whether the rejection form is visible
//   rejectReason  — the text the client typed
//   isLoading     — prevents double-submitting

function DeliveryCard({ milestone, token, clientName }) {
  const router = useRouter()

  // checkedItems is a Set of array indices.
  // e.g. if the client checks the first and third item: Set {0, 2}
  // We use a Set because checking/unchecking is O(1) and order doesn't matter.
  // This is LOCAL STATE ONLY — we never save this to the DB.
  // The checkboxes are a tool to help the client work through the list
  // before they click Approve. That's their only purpose.
  const [checkedItems,  setCheckedItems]  = useState(new Set())
  const [isWorkLogOpen, setIsWorkLogOpen] = useState(false)
  const [isRejecting,   setIsRejecting]   = useState(false)
  const [rejectReason,  setRejectReason]  = useState('')
  const [isLoading,     setIsLoading]     = useState(false)

  const checklist = milestone.deliveryChecklist ?? []
  const workLog   = milestone.milestoneUpdates  ?? []

  // Toggle one checklist item on or off
  const toggleCheck = (index) => {
    setCheckedItems(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
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
      className="rounded-2xl border border-amber-500/20 overflow-hidden mb-6"
      style={{ background: '#0e0e12' }}
    >
      {/* ── Top accent bar ── */}
      {/* A thin amber line signals "this needs your attention" */}
      <div className="h-0.5 w-full bg-gradient-to-r from-amber-500 to-amber-400/30" />

      <div className="p-6">

        {/* ── Status label ── */}
        <div className="flex items-center gap-2 mb-4">
          {/* Pulsing amber dot */}
          <div className="relative flex items-center justify-center w-5 h-5">
            <span className="absolute inline-flex w-full h-full rounded-full bg-amber-500 opacity-20 animate-ping" />
            <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <p
            className="text-xs font-bold uppercase tracking-[0.2em]"
            style={{ color: '#F59E0B', fontFamily: 'DM Mono, monospace' }}
          >
            Awaiting Your Review
          </p>
        </div>

        {/* ── Headline ── */}
        {/* The most important text on the card. Large, serif, prominent. */}
        <h3
          className="text-xl font-bold text-white mb-3 leading-snug"
          style={{ fontFamily: 'Fraunces, Georgia, serif' }}
        >
          {milestone.deliveryHeadline ?? milestone.title}
        </h3>

        {/* ── Summary ── */}
        {milestone.deliverySummary && (
          <p
            className="text-sm leading-relaxed mb-5"
            style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif' }}
          >
            {milestone.deliverySummary}
          </p>
        )}

        {/* ── File preview or download ── */}
        {milestone.deliveryFileUrl && (
          <div className="mb-5">
            {milestone.deliveryFileType?.startsWith('image/') ? (
              // Image — show as a large preview, clicking opens full size
              
              <a href={milestone.deliveryFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl overflow-hidden border border-white/5 hover:opacity-90 transition-opacity"
              >
                <img
                  src={milestone.deliveryFileUrl}
                  alt={milestone.deliveryFileName ?? 'Deliverable'}
                  className="w-full max-h-72 object-cover"
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
              // Non-image file — download button
              
              <a href={milestone.deliveryFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3 hover:border-amber-500/40 transition-colors group"
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

        {/* ── Checklist ── */}
        {/* Only rendered if the freelancer added checklist items */}
        {checklist.length > 0 && (
          <div className="mb-5">
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
                    {/* Custom checkbox */}
                    {/* WHY not a real <input type="checkbox">: we want full */}
                    {/* control over the visual style to match the dark theme */}
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
                      className={`text-sm transition-colors ${
                        isChecked ? 'line-through' : ''
                      }`}
                      style={{
                        color: isChecked ? '#6b7280' : '#e5e7eb',
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

        {/* ── Approve / Request Changes buttons ── */}
        {!isRejecting ? (
          <div className="flex gap-3 mt-2">
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
                ? <Loader2  className="w-4 h-4 animate-spin" />
                : <CheckCircle className="w-4 h-4" />
              }
              {isLoading ? 'Approving...' : 'Approve'}
            </button>
          </div>
        ) : (
          // Rejection form — appears in place of the buttons
          <div
            className="rounded-xl border border-white/10 p-4 mt-2"
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
              placeholder="e.g. The colour scheme doesn't match our brand guidelines. Please use #003366."
              rows={3}
              className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-none border border-white/10 focus:border-amber-500/50 focus:ring-0"
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
                className="flex-1 text-sm py-2 rounded-xl border border-white/10 transition-colors hover:border-white/20"
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
                {isLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : null
                }
                Submit Feedback
              </button>
            </div>
          </div>
        )}

        {/* ── Work log toggle ── */}
        {/* Collapsed by default — client doesn't need to see every update */}
        {/* but it's available if they want to understand what was done     */}
        {workLog.length > 0 && (
          <div className="mt-5 pt-5 border-t border-white/5">
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
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500/40 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: '#d1d5db' }}
                      >
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
            background: '#F59E0B18',
            color: '#F59E0B',
            fontFamily: 'DM Mono, monospace',
          }}
        >
          {progressPercentage}% Complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-white/5 rounded-full h-2 mb-8">
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{
            width: `${progressPercentage}%`,
            background: 'linear-gradient(90deg, #F59E0B, #FBBF24)',
          }}
        />
      </div>

      {/* Milestone list */}
      <div className="space-y-6">
        {milestones.map((milestone, index) => {
          const isCompleted  = milestone.status === 'COMPLETED'
          const isInProgress = milestone.status === 'IN_PROGRESS'
          const isInReview   = milestone.status === 'IN_REVIEW'
          const isPending    = milestone.status === 'PENDING'
          const isLast       = index === milestones.length - 1

          // IN_REVIEW milestones get the full delivery card treatment.
          // The card takes the place of the normal timeline row entirely.
          if (isInReview) {
            return (
              <div key={milestone.id} className="relative">
                {/* Connecting line above the card */}
                {index > 0 && (
                  <div
                    className="absolute -top-6 left-3 w-px h-6"
                    style={{ background: '#ffffff08' }}
                  />
                )}
                <DeliveryCard
                  milestone={milestone}
                  token={token}
                  clientName={clientName}
                />
              </div>
            )
          }

          // All other statuses use the standard timeline node
          return (
            <div key={milestone.id} className="relative">
              {/* Connecting line between nodes */}
              {!isLast && (
                <div
                  className="absolute left-3 top-8 w-px"
                  style={{
                    bottom: '-1.5rem',
                    background: isCompleted ? '#F59E0B22' : '#ffffff08',
                  }}
                />
              )}

              <div className="flex items-start gap-4">
                {/* Status icon */}
                <div className="relative z-10 pt-1 shrink-0" style={{ background: '#0e0e12' }}>
                  {isCompleted  && <CheckCircle2     className="w-6 h-6" style={{ color: '#F59E0B' }} />}
                  {isInProgress && <ArrowRightCircle className="w-6 h-6 text-blue-400" />}
                  {isPending    && <CircleDashed     className="w-6 h-6" style={{ color: '#374151' }} />}
                </div>

                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      isCompleted  ? 'line-through opacity-40' :
                      isInProgress ? 'text-white' :
                      'text-gray-600'
                    }`}
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    {milestone.title}
                  </p>

                  {isCompleted && (
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: '#F59E0B', fontFamily: 'DM Mono, monospace' }}
                    >
                      ✓ Approved
                      {milestone.completedAt && ` · ${timeAgo(milestone.completedAt)}`}
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
                      style={{ color: '#374151', fontFamily: 'DM Mono, monospace' }}
                    >
                      {milestone.dueDate
                        ? `Due ${new Date(milestone.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                        : 'Not started'
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}