// components/portal/ProjectMilestones.jsx
// The project timeline. Every milestone is a row; a milestone that is
// IN_REVIEW expands into a DeliveryCard where the client approves it or asks
// for changes.
//
// DeliveryCard can show the Decision Map: when the delivery image has
// annotations, it renders with numbered pins. Each pin opens a note explaining
// the decision behind it, viewed pins turn green, and once every pin has been
// read a "ready to approve" message appears.
'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import {
  Check, CheckCheck, CheckCircle2, ChevronDown, ChevronUp, Download,
  ExternalLink, ListChecks, Paperclip, X, XCircle,
} from 'lucide-react'
import { formatDate, formatSize } from '@/components/dashboard/requests/request-format'
import { timeAgo } from '@/lib/portal-format'
import { Badge, Button, Card, CardBody, CardHeader, Eyebrow, FieldLabel, controlClass, focusRing } from './ui'

// ── Timeline nodes ────────────────────────────────────────────────────────────

function Node({ status }) {
  if (status === 'COMPLETED') {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fp-portal-success text-white">
        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
      </span>
    )
  }
  if (status === 'IN_PROGRESS' || status === 'IN_REVIEW') {
    return (
      <span className="relative flex h-6 w-6 items-center justify-center">
        <span className="absolute inline-flex h-full w-full rounded-full bg-fp-portal-accent opacity-25 motion-safe:animate-ping" />
        <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-fp-portal-accent ring-4 ring-fp-portal-surface" />
      </span>
    )
  }
  return <span className="block h-6 w-6 rounded-full border-2 border-fp-portal-border bg-fp-portal-surface" />
}

// ── Decision Map ──────────────────────────────────────────────────────────────
// Read-only pin viewer. Props:
//   imageUrl    Cloudinary URL of the delivery image
//   imageName   shown in the caption
//   annotations [{ id, x, y, title, note }] with x/y as 0..1 fractions; never
//               empty here, the caller checks `annotations.length > 0`

function AnnotationViewer({ imageUrl, imageName, annotations }) {
  // Pins the client has opened at least once. They render green.
  const [viewedPins, setViewedPins] = useState(new Set())
  // The pin whose note is open; only one at a time.
  const [activePinId, setActivePinId] = useState(null)

  const allViewed = annotations.length > 0 && annotations.every((pin) => viewedPins.has(pin.id))

  // Opens a pin (and marks it viewed); clicking the open pin closes it.
  const handlePinClick = (pinId) => {
    setViewedPins((prev) => new Set([...prev, pinId]))
    setActivePinId((prev) => (prev === pinId ? null : pinId))
  }

  // Keeps the note inside the image: below the pin in the top 40% of the image
  // and above it otherwise; pinned to the near edge when the pin is within the
  // outer quarter, centred otherwise. The image box has no overflow:hidden, so
  // a note may still extend past the image on narrow screens.
  const getPopoverStyle = (pin) => {
    const style = {}
    if (pin.y < 0.4) style.top = 'calc(100% + 14px)'
    else style.bottom = 'calc(100% + 14px)'

    if (pin.x > 0.75) {
      style.right = '0'
    } else if (pin.x < 0.25) {
      style.left = '0'
    } else {
      style.left = '50%'
      style.transform = 'translateX(-50%)'
    }
    return style
  }

  return (
    <div>
      <Eyebrow>Why we built it this way</Eyebrow>
      <p className="mb-3 mt-1 text-sm text-fp-portal-text-secondary">
        Select a numbered point to read the decision behind it.
      </p>

      <div
        className="relative rounded-xl border border-fp-portal-border"
        onClick={() => setActivePinId(null)}
        onKeyDown={(e) => e.key === 'Escape' && setActivePinId(null)}
      >
        <img src={imageUrl} alt={imageName ?? 'Deliverable'} className="block w-full rounded-xl" draggable={false} />

        {annotations.map((pin, index) => {
          const isActive = activePinId === pin.id
          const isViewed = viewedPins.has(pin.id)
          const label = `Decision ${index + 1}${pin.title ? `: ${pin.title}` : ''}${isViewed ? ' (read)' : ''}`

          return (
            <div key={pin.id} className="absolute" style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}>
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute h-10 w-10 rounded-full border-2 opacity-60 motion-safe:animate-pulse ${
                  isViewed ? 'border-fp-portal-success' : 'border-fp-portal-accent'
                }`}
                style={{ transform: 'translate(-50%, -50%)' }}
              />

              <button
                type="button"
                aria-label={label}
                aria-expanded={isActive}
                onClick={(e) => {
                  e.stopPropagation()
                  handlePinClick(pin.id)
                }}
                className={`absolute z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white shadow-md ring-2 ring-white transition-transform duration-150 hover:scale-110 ${focusRing} ${
                  isViewed ? 'bg-fp-portal-success' : 'bg-fp-portal-accent-strong'
                }`}
                style={{ transform: 'translate(-50%, -50%)' }}
              >
                {index + 1}
              </button>

              {isActive && (
                <div
                  role="dialog"
                  aria-label={label}
                  className="absolute z-50 w-max max-w-[15rem] rounded-xl border border-fp-portal-border bg-fp-portal-surface p-4 shadow-fp-pop"
                  style={getPopoverStyle(pin)}
                  // Clicks inside the note must not reach the image's "close" handler.
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    aria-label="Close note"
                    onClick={() => setActivePinId(null)}
                    className={`absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-lg text-fp-portal-text-muted transition-colors hover:bg-fp-portal-raised hover:text-fp-portal-text-primary ${focusRing}`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>

                  <div className="mb-2 flex items-center gap-2 pr-7">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-fp-portal-accent-strong text-[11px] font-bold text-white">
                      {index + 1}
                    </span>
                    {pin.title && (
                      <p className="text-xs font-bold uppercase tracking-wide text-fp-portal-accent-strong">{pin.title}</p>
                    )}
                  </div>

                  {pin.note ? (
                    <p className="text-sm leading-relaxed text-fp-portal-text-primary">{pin.note}</p>
                  ) : (
                    <p className="text-sm italic text-fp-portal-text-muted">No explanation added.</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {imageName && (
        <p className="mt-2 flex items-center gap-2 px-1 text-xs text-fp-portal-text-muted">
          <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{imageName}</span>
        </p>
      )}

      {allViewed && (
        <div role="status" className="mt-3 flex items-start gap-3 rounded-xl border border-fp-portal-success/20 bg-fp-portal-success/8 p-3.5">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-fp-portal-success" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-fp-portal-success">
              You&apos;ve read all {annotations.length} decision {annotations.length === 1 ? 'note' : 'notes'}.
            </p>
            <p className="mt-0.5 text-sm text-fp-portal-text-secondary">You&apos;re ready to approve.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── DeliveryCard ──────────────────────────────────────────────────────────────
// Replaces the simple row when milestone.status === 'IN_REVIEW'.

function DeliveryFile({ milestone, annotations }) {
  if (!milestone.deliveryFileUrl) return null

  const isImage = milestone.deliveryFileType?.startsWith('image/')

  // Image with annotations: the Decision Map viewer.
  if (isImage && annotations.length > 0) {
    return (
      <AnnotationViewer
        imageUrl={milestone.deliveryFileUrl}
        imageName={milestone.deliveryFileName}
        annotations={annotations}
      />
    )
  }

  // Image without annotations: preview that opens full size.
  if (isImage) {
    return (
      <a
        href={milestone.deliveryFileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`group block overflow-hidden rounded-xl border border-fp-portal-border ${focusRing}`}
      >
        <img
          src={milestone.deliveryFileUrl}
          alt={milestone.deliveryFileName ?? 'Deliverable'}
          className="max-h-72 w-full object-cover transition-opacity group-hover:opacity-90"
        />
        <span className="flex items-center gap-2 bg-fp-portal-raised px-3.5 py-2.5 text-xs text-fp-portal-text-secondary">
          <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{milestone.deliveryFileName}</span>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            View full size <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </span>
        </span>
      </a>
    )
  }

  // Any other file: download chip.
  return (
    <a
      href={milestone.deliveryFileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 rounded-xl border border-fp-portal-border bg-fp-portal-bg px-4 py-3 transition-colors hover:bg-fp-portal-raised ${focusRing}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-fp-portal-accent/10 text-fp-portal-accent-strong">
        <Download className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-fp-portal-text-primary">
          {milestone.deliveryFileName ?? 'Download file'}
        </span>
        <span className="block text-xs text-fp-portal-text-muted">Opens in a new tab</span>
      </span>
    </a>
  )
}

function DeliveryCard({ milestone, token }) {
  const router = useRouter()
  const checklistId = useId()
  const reasonId = useId()
  const workLogId = useId()

  const [checkedItems, setCheckedItems] = useState(new Set())
  const [isWorkLogOpen, setIsWorkLogOpen] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const checklist = milestone.deliveryChecklist ?? []
  const workLog = milestone.milestoneUpdates ?? []

  // Prisma returns null for older milestones; always work with an array.
  const annotations = Array.isArray(milestone.deliveryAnnotations) ? milestone.deliveryAnnotations : []

  const toggleCheck = (index) => {
    setCheckedItems((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const handleApprove = async () => {
    setIsLoading(true)
    try {
      await axios.patch(`/api/portal/${token}/approve`, {
        itemId: milestone.id,
        type: 'milestone',
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
        type: 'milestone',
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
    <div className="rounded-xl border border-fp-portal-accent/30 bg-fp-portal-surface shadow-fp-card">
      <div className="p-4 sm:p-5">
        <Badge tone="accent">Ready for your review</Badge>

        <h3 className="mt-3 font-display text-xl font-medium leading-snug text-fp-portal-text-primary">
          {milestone.deliveryHeadline ?? milestone.title}
        </h3>

        {milestone.deliverySummary && (
          <p className="mt-2 text-sm leading-relaxed text-fp-portal-text-secondary">{milestone.deliverySummary}</p>
        )}

        {milestone.deliveryFileUrl && (
          <div className="mt-4">
            <DeliveryFile milestone={milestone} annotations={annotations} />
          </div>
        )}

        {checklist.length > 0 && (
          <div className="mt-5">
            <Eyebrow id={checklistId} className="mb-3">Before you approve, please check</Eyebrow>
            <ul role="group" aria-labelledby={checklistId} className="space-y-2">
              {checklist.map((item, index) => {
                const isChecked = checkedItems.has(index)
                return (
                  <li key={index}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isChecked}
                      onClick={() => toggleCheck(index)}
                      className={`flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors duration-150 ${focusRing} ${
                        isChecked
                          ? 'border-fp-portal-accent/40 bg-fp-portal-accent/5'
                          : 'border-fp-portal-border bg-fp-portal-surface hover:bg-fp-portal-raised'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors duration-150 ${
                          isChecked
                            ? 'border-fp-portal-accent-strong bg-fp-portal-accent-strong text-white'
                            : 'border-fp-portal-border-control bg-fp-portal-surface'
                        }`}
                      >
                        {isChecked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                      <span className="text-sm text-fp-portal-text-primary">{item}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <div className="mt-5">
          {!isRejecting ? (
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button icon={XCircle} className="sm:flex-1" disabled={isLoading} onClick={() => setIsRejecting(true)}>
                Request changes
              </Button>
              <Button
                variant="success"
                icon={CheckCircle2}
                className="sm:flex-1"
                loading={isLoading}
                onClick={handleApprove}
              >
                {isLoading ? 'Approving…' : 'Approve'}
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-fp-portal-border bg-fp-portal-bg p-4">
              <FieldLabel htmlFor={reasonId}>What needs to change?</FieldLabel>
              <textarea
                id={reasonId}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. The colour scheme doesn't match our brand guidelines."
                rows={3}
                className={controlClass}
              />
              <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  className="sm:flex-1"
                  onClick={() => {
                    setIsRejecting(false)
                    setRejectReason('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  className="sm:flex-1"
                  loading={isLoading}
                  disabled={!rejectReason.trim()}
                  onClick={handleReject}
                >
                  Submit feedback
                </Button>
              </div>
            </div>
          )}
        </div>

        {workLog.length > 0 && (
          <div className="mt-5 border-t border-fp-portal-border pt-4">
            <button
              type="button"
              aria-expanded={isWorkLogOpen}
              aria-controls={workLogId}
              onClick={() => setIsWorkLogOpen((open) => !open)}
              className={`flex min-h-9 items-center gap-1.5 rounded-lg text-sm font-semibold text-fp-portal-text-secondary transition-colors hover:text-fp-portal-text-primary ${focusRing}`}
            >
              {isWorkLogOpen ? (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              )}
              {isWorkLogOpen ? 'Hide' : 'View'} work log ({workLog.length} {workLog.length === 1 ? 'entry' : 'entries'})
            </button>

            {isWorkLogOpen && (
              <ul id={workLogId} className="mt-3 space-y-3">
                {workLog.map((entry) => (
                  <li key={entry.id} className="flex gap-3">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-fp-portal-accent/50" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-relaxed text-fp-portal-text-secondary">{entry.note}</p>
                      {entry.fileUrl && (
                        <a
                          href={entry.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded text-xs font-medium text-fp-portal-accent-strong hover:underline ${focusRing}`}
                        >
                          <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{entry.fileName}</span>
                          {entry.fileSize && <span className="shrink-0 text-fp-portal-text-muted">{formatSize(entry.fileSize)}</span>}
                        </a>
                      )}
                      <p className="mt-1 text-xs text-fp-portal-text-muted">{timeAgo(entry.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Timeline ──────────────────────────────────────────────────────────────────

function MilestoneSummary({ milestone }) {
  const { status } = milestone

  return (
    <div className="pt-0.5">
      <p
        className={`text-sm font-semibold leading-snug ${
          status === 'PENDING' ? 'text-fp-portal-text-secondary' : 'text-fp-portal-text-primary'
        }`}
      >
        {milestone.title}
      </p>

      {status === 'COMPLETED' && (
        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-fp-portal-success">
          <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Approved{milestone.completedAt && ` · ${formatDate(milestone.completedAt)}`}
        </p>
      )}
      {status === 'IN_PROGRESS' && (
        <p className="mt-1 text-xs text-fp-portal-text-secondary">Currently being worked on</p>
      )}
      {status === 'PENDING' && (
        <p className="mt-1 text-xs text-fp-portal-text-muted">
          {milestone.dueDate ? `Due ${formatDate(milestone.dueDate)}` : 'Not started yet'}
        </p>
      )}
    </div>
  )
}

export default function ProjectMilestones({ milestones, token }) {
  if (!milestones || milestones.length === 0) return null

  return (
    <Card as="section" aria-labelledby="timeline-title">
      <CardHeader icon={ListChecks} titleId="timeline-title" title="Milestones" count={milestones.length} />

      <CardBody>
        <ol className="relative space-y-7">
          {/* Rail behind the nodes; each node sits on a surface-coloured halo. */}
          {milestones.length > 1 && (
            <span aria-hidden="true" className="absolute bottom-3 left-[11px] top-3 w-px bg-fp-portal-border" />
          )}

          {milestones.map((milestone) => (
            <li key={milestone.id} className="relative flex gap-4">
              <span aria-hidden="true" className="relative z-10 mt-0.5 shrink-0 bg-fp-portal-surface">
                <Node status={milestone.status} />
              </span>

              <div className="min-w-0 flex-1">
                {milestone.status === 'IN_REVIEW' ? (
                  <DeliveryCard milestone={milestone} token={token} />
                ) : (
                  <MilestoneSummary milestone={milestone} />
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  )
}
