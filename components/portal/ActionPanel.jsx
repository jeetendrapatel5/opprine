// components/portal/ActionPanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Handles approval of Update-level items (the legacy Update model).
// Milestone-level approvals are handled inside ProjectMilestones → DeliveryCard.
//
// Only rendered when items.length > 0, so it never shows an empty state.
//
// Design:
// - fp-portal-accent/8 background — a very soft amber wash that signals
//   "this section requires your attention" without alarming the client.
// - Approve button: fp-portal-success (forest green) — feels like a positive
//   confirmation, not a corporate submit button.
// - Request Changes: secondary ghost button — non-threatening, easy to find
//   but doesn't compete with Approve for visual attention.
// - The textarea for rejection reason appears inline — no separate page or
//   modal. Inline keeps the client in context.
// ─────────────────────────────────────────────────────────────────────────────
'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, AlertCircle, Loader2, Paperclip } from 'lucide-react'
import axios from 'axios'
import { useRouter } from 'next/navigation'

function formatSize(bytes) {
  if (!bytes)              return ''
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60)    return 'just now'
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// Shows the milestone's work log entries so the client knows what was done
function WorkContext({ updates }) {
  if (!updates || updates.length === 0) return null
  return (
    <div className="mt-3 pt-3 border-t border-fp-portal-border">
      <p className="text-[10px] font-bold uppercase tracking-widest text-fp-portal-text-tertiary mb-2">
        What was done
      </p>
      <div className="space-y-2">
        {updates.map((u) => (
          <div key={u.id} className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-fp-portal-accent mt-1.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-fp-portal-text-primary">{u.note}</p>
              {u.fileUrl && (
                <div className="mt-1.5">
                  {u.fileType?.startsWith('image/') ? (
                    <a href={u.fileUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={u.fileUrl}
                        alt={u.fileName}
                        className="max-h-40 rounded-lg border border-fp-portal-border object-cover hover:opacity-90 transition-opacity cursor-zoom-in"
                      />
                    </a>
                  ) : (
                    <a
                      href={u.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="
                        inline-flex items-center gap-1.5
                        bg-fp-portal-raised border border-fp-portal-border
                        rounded-lg px-2.5 py-1 text-xs font-medium text-fp-portal-text-secondary
                        hover:border-fp-portal-accent/30 hover:text-fp-portal-accent
                        transition-colors duration-150
                      "
                    >
                      <Paperclip className="w-3 h-3" />
                      <span className="truncate max-w-[180px]">{u.fileName}</span>
                      {u.fileSize && (
                        <span className="text-fp-portal-text-tertiary">{formatSize(u.fileSize)}</span>
                      )}
                    </a>
                  )}
                </div>
              )}
              <p className="text-[10px] text-fp-portal-text-tertiary mt-0.5">
                {timeAgo(u.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ActionPanel({ items, token }) {
  const [loadingId,    setLoadingId]    = useState(null)
  const [rejectingId,  setRejectingId]  = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const router = useRouter()

  if (items.length === 0) return null

  // Milestones have 'title'. Legacy Updates have 'text'.
  const getType = (item) => item.title ? 'milestone' : 'update'

  const handleApprove = async (itemId, type) => {
    setLoadingId(itemId)
    try {
      await axios.patch(`/api/portal/${token}/approve`, { itemId, type, action: 'approve' })
      router.refresh()
    } catch {
      alert('Failed to approve. Please try again.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleReject = async (itemId, type) => {
    if (!rejectReason.trim()) {
      alert('Please describe what needs to change.')
      return
    }
    setLoadingId(itemId)
    try {
      await axios.patch(`/api/portal/${token}/approve`, {
        itemId,
        type,
        action: 'reject',
        reason: rejectReason.trim(),
      })
      setRejectingId(null)
      setRejectReason('')
      router.refresh()
    } catch {
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    // Soft amber wash — "something needs you" without alarm
    <div className="
      bg-fp-portal-accent/8 border border-fp-portal-accent/20
      rounded-xl p-5 mb-6
    ">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-4 h-4 text-fp-portal-accent" />
        <h2 className="text-fp-portal-text-primary text-sm font-semibold">
          Awaiting Your Review
        </h2>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const type        = getType(item)
          const isRejecting = rejectingId === item.id
          const isLoading   = loadingId   === item.id
          const workLog     = item.milestoneUpdates ?? []

          return (
            <div
              key={item.id}
              className="bg-fp-portal-surface border border-fp-portal-border rounded-xl p-4"
            >
              {/* Item header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-fp-portal-text-primary text-sm font-semibold leading-snug">
                    {item.title || item.text}
                  </p>
                  <p className="text-fp-portal-text-tertiary text-xs mt-0.5 italic">
                    Ready for your sign-off
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Request Changes — secondary, ghost */}
                  <button
                    onClick={() => {
                      if (isRejecting) {
                        setRejectingId(null)
                        setRejectReason('')
                      } else {
                        setRejectingId(item.id)
                        setRejectReason('')
                      }
                    }}
                    disabled={isLoading}
                    className="
                      flex items-center gap-1.5
                      border border-fp-portal-border text-fp-portal-text-secondary
                      text-xs font-semibold px-3 py-2 rounded-lg
                      hover:border-fp-portal-danger/30 hover:text-fp-portal-danger
                      transition-colors duration-150 disabled:opacity-50
                    "
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    {isRejecting ? 'Cancel' : 'Request Changes'}
                  </button>

                  {/* Approve — primary, success green */}
                  <button
                    onClick={() => handleApprove(item.id, type)}
                    disabled={isLoading || isRejecting}
                    className="
                      flex items-center gap-1.5
                      bg-fp-portal-success hover:bg-fp-portal-success/80
                      text-white text-xs font-bold px-3 py-2 rounded-lg
                      transition-colors duration-150 disabled:opacity-50
                    "
                  >
                    {isLoading && !isRejecting
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <CheckCircle2 className="w-3.5 h-3.5" />
                    }
                    Approve
                  </button>
                </div>
              </div>

              {/* Work log — only for milestone-type items */}
              <WorkContext updates={workLog} />

              {/* Rejection form — inline, appears below when "Request Changes" clicked */}
              {isRejecting && (
                <div className="mt-4 pt-4 border-t border-fp-portal-border">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-fp-portal-text-tertiary mb-2">
                    What needs to change?
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. The colour scheme doesn't match our brand. Please use our navy blue."
                    rows={3}
                    className="
                      w-full bg-fp-portal-raised border border-fp-portal-border
                      text-fp-portal-text-primary text-sm rounded-lg px-3 py-2.5
                      placeholder:text-fp-portal-text-tertiary resize-none
                      focus:outline-none focus:ring-2 focus:ring-fp-portal-accent/20
                      focus:border-fp-portal-accent/40 transition-colors duration-150
                    "
                  />
                  <button
                    onClick={() => handleReject(item.id, type)}
                    disabled={isLoading || !rejectReason.trim()}
                    className="
                      mt-2 flex items-center gap-2
                      bg-fp-portal-danger hover:bg-fp-portal-danger/80
                      text-white text-xs font-bold px-4 py-2 rounded-lg
                      transition-colors duration-150 disabled:opacity-50
                    "
                  >
                    {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Submit Feedback
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}