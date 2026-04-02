// components/portal/ProjectMilestones.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The project timeline — the backbone of the client portal.
// Shows every milestone with its status, and when a milestone is IN_REVIEW,
// replaces the simple row with a full DeliveryCard for approve/reject.
//
// EXTENDED: DeliveryCard now includes the Decision Map annotation viewer.
// When a delivery image has annotations (deliveryAnnotations is a non-empty
// array), the image renders with interactive numbered pins. Each pin opens
// a popover showing the decision title and explanation. Viewed pins turn green.
// When all pins have been viewed, a completion message appears above the
// approve button — a psychological signal that the client has done due
// diligence and is ready to approve.
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

// ── AnnotationViewer ──────────────────────────────────────────────────────────
// The read-only pin interface shown on the client portal.
// Renders an image with interactive numbered pins.
// Clicking a pin opens a popover. Viewed pins turn green.
// When all pins have been viewed, shows a completion message.
//
// Props:
//   imageUrl    — string — Cloudinary URL of the delivery image
//   imageName   — string — shown in the footer caption
//   annotations — array  — [{ id, x, y, title, note }] — never null here,
//                          caller guards with `annotations.length > 0` check

function AnnotationViewer({ imageUrl, imageName, annotations }) {

  // viewedPins — Set of pin IDs the client has clicked (opened at least once).
  // Once a pin ID is in this set, the pin renders green.
  const [viewedPins,  setViewedPins]  = useState(new Set())

  // activePinId — the pin whose popover is currently open.
  // null means no popover is showing.
  // Only one popover can be open at a time.
  const [activePinId, setActivePinId] = useState(null)

  // When all pins have been viewed, show the completion message.
  const allViewed = annotations.length > 0
    && annotations.every(pin => viewedPins.has(pin.id))

  // handlePinClick — marks pin as viewed and toggles its popover.
  // Clicking the active pin closes it. Clicking a different pin closes
  // the current one and opens the new one.
  const handlePinClick = (pinId) => {
    setViewedPins(prev => new Set([...prev, pinId]))
    setActivePinId(prev => prev === pinId ? null : pinId)
  }

  // getPopoverStyle — calculates where the popover should appear relative
  // to the pin's anchor point.
  //
  // Vertical rule:
  //   pin.y < 0.4 → show BELOW the pin (pin is in the top 40% of image)
  //   pin.y >= 0.4 → show ABOVE the pin (pin is in the bottom 60% of image)
  //
  // Horizontal rule:
  //   pin.x > 0.75 → align popover's right edge to pin center (avoid right overflow)
  //   pin.x < 0.25 → align popover's left edge to pin center (avoid left overflow)
  //   otherwise     → center popover horizontally on pin
  //
  // WHY: The popover is position:absolute inside the pin anchor div,
  // which itself is position:absolute inside the image container.
  // The image container does NOT have overflow:hidden on the portal side,
  // so popovers can extend beyond the image boundary freely.
  const getPopoverStyle = (pin) => {
    const style = {}

    // Vertical
    if (pin.y < 0.4) {
      style.top = 'calc(100% + 10px)'
    } else {
      style.bottom = 'calc(100% + 10px)'
    }

    // Horizontal
    if (pin.x > 0.75) {
      style.right = '0'
    } else if (pin.x < 0.25) {
      style.left = '0'
    } else {
      style.left      = '50%'
      style.transform = 'translateX(-50%)'
    }

    return style
  }

  return (
    <div>

      {/* Section heading */}
      <div className="mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-fp-portal-text-tertiary">
          Why we built it this way
        </p>
        <p className="text-xs text-fp-portal-text-tertiary mt-0.5">
          Click any numbered point to read the decision behind it.
        </p>
      </div>

      {/* Image container — NO overflow:hidden here.
          Popovers are absolutely positioned children that need to extend
          outside the image boundary. The image gets its own rounded corners.
          position:relative is required for absolute pin positioning.
      */}
      <div
        className="relative rounded-xl border border-fp-portal-border"
        onClick={() => setActivePinId(null)}
      >
        <img
          src={imageUrl}
          alt={imageName ?? 'Deliverable'}
          // rounded-xl on the image itself clips its corners cleanly
          // since the container doesn't have overflow-hidden
          className="w-full rounded-xl block"
          draggable={false}
        />

        {/* Render all pins */}
        {annotations.map((pin, index) => {
          const isActive = activePinId === pin.id
          const isViewed = viewedPins.has(pin.id)

          return (
            <div
              key={pin.id}
              // Anchor div — positioned at the pin's percentage coordinates
              className="absolute"
              style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
            >
              {/* Pulse ring — green if viewed, indigo if not */}
              <div
                className={`
                  absolute w-9 h-9 rounded-full border-2 opacity-60 animate-pulse
                  ${isViewed ? 'border-emerald-300' : 'border-indigo-400'}
                `}
                style={{ transform: 'translate(-50%, -50%)' }}
              />

              {/* Number circle — green if viewed, indigo if not */}
              <div
                className={`
                  absolute w-7 h-7 rounded-full flex items-center justify-center
                  text-xs font-bold text-white cursor-pointer z-10
                  transition-transform duration-150 hover:scale-110
                  ${isViewed ? 'bg-emerald-600' : 'bg-indigo-600'}
                `}
                style={{ transform: 'translate(-50%, -50%)' }}
                onClick={(e) => {
                  e.stopPropagation()
                  handlePinClick(pin.id)
                }}
              >
                {index + 1}
              </div>

              {/* Popover — only shown when this pin is active */}
              {isActive && (
                <div
                  className="absolute z-50 bg-white rounded-2xl shadow-xl p-4 max-w-[240px] w-max border border-gray-100"
                  style={getPopoverStyle(pin)}
                  // Prevent clicks inside the popover from closing it
                  // (the image container's onClick would otherwise fire)
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close button */}
                  <button
                    className="absolute top-2 right-2.5 text-gray-400 hover:text-gray-700 text-base cursor-pointer leading-none"
                    onClick={() => setActivePinId(null)}
                    aria-label="Close"
                  >
                    ×
                  </button>

                  {/* Pin number + title */}
                  <div className="flex items-center gap-2 mb-1.5 pr-4">
                    <span className="
                      w-5 h-5 rounded-full bg-indigo-600 text-white
                      text-[10px] font-bold flex items-center justify-center shrink-0
                    ">
                      {index + 1}
                    </span>
                    {pin.title && (
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
                        {pin.title}
                      </p>
                    )}
                  </div>

                  {/* Explanation */}
                  {pin.note ? (
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {pin.note}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">
                      No explanation added.
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Caption — filename, same style as before for non-annotated images */}
      {imageName && (
        <div className="flex items-center gap-2 mt-1.5 px-1 text-xs text-fp-portal-text-tertiary">
          <Paperclip className="w-3 h-3 shrink-0" />
          <span className="truncate">{imageName}</span>
        </div>
      )}

      {/* Completion message — shown when all pins have been viewed */}
      {allViewed && (
        <div className="flex items-center gap-2 mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-700">
              You've reviewed all {annotations.length}{' '}
              {annotations.length === 1 ? 'decision note' : 'decision notes'}.
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              You're ready to approve.
            </p>
          </div>
        </div>
      )}
    </div>
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

  // Normalize annotations — Prisma returns null for old milestones.
  // Always work with an array, never call .map() on null.
  const annotations = Array.isArray(milestone.deliveryAnnotations)
    ? milestone.deliveryAnnotations
    : []

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
      {/* Amber top bar */}
      <div className="h-[2px] w-full bg-fp-portal-accent" />

      <div className="p-5">

        {/* Headline */}
        <h3 className="font-display text-lg font-medium text-fp-portal-text-primary mb-2 leading-snug">
          {milestone.deliveryHeadline ?? milestone.title}
        </h3>

        {/* Summary */}
        {milestone.deliverySummary && (
          <p className="text-fp-portal-text-secondary text-sm leading-relaxed mb-4">
            {milestone.deliverySummary}
          </p>
        )}

        {/* File section ─────────────────────────────────────────────────────
            Three cases:
            1. Image with annotations → AnnotationViewer (new)
            2. Image without annotations → simple link (existing behavior)
            3. Non-image file → download chip (existing behavior, unchanged)
        */}
        {milestone.deliveryFileUrl && (
          <div className="mb-4">
            {milestone.deliveryFileType?.startsWith('image/') ? (
              annotations.length > 0 ? (
                // ── Case 1: Image WITH annotations — Decision Map viewer ──────
                <AnnotationViewer
                  imageUrl={milestone.deliveryFileUrl}
                  imageName={milestone.deliveryFileName}
                  annotations={annotations}
                />
              ) : (
                // ── Case 2: Image WITHOUT annotations — link to full size ─────
                
                <a href={milestone.deliveryFileUrl}
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
              )
            ) : (
              // ── Case 3: Non-image file — download chip (unchanged) ──────────
              
              <a href={milestone.deliveryFileUrl}
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

        {/* Checklist */}
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

        {/* Approve / Request Changes */}
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

        {/* Work log toggle */}
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
                        
                        <a href={entry.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-1.5 text-xs text-fp-portal-accent hover:underline"
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

      {/* Timeline */}
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

                {/* Node */}
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