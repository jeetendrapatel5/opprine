// components/portal/ActionPanel.jsx
'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, Loader2, ChevronDown, Paperclip } from 'lucide-react'
import axios from 'axios'
import { useRouter } from 'next/navigation'

// Formats bytes to readable size
function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// The work context shown inside each approval card
// Shows the milestoneUpdates so the client knows what was done
function WorkContext({ updates }) {
  if (!updates || updates.length === 0) return null

  return (
    <div className="mt-3 pt-3 border-t border-amber-100">
      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-2">
        What was done:
      </p>
      <div className="space-y-2">
        {updates.map((u) => (
          <div key={u.id} className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700">{u.note}</p>

              {/* Attached file */}
              {u.fileUrl && (
                <div className="mt-1.5">
                  {u.fileType?.startsWith('image/') ? (
                    <a href={u.fileUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={u.fileUrl}
                        alt={u.fileName}
                        className="max-h-40 rounded-lg border border-amber-100 object-cover hover:opacity-90 transition-opacity cursor-zoom-in"
                      />
                    </a>
                  ) : (
                    
                     <a href={u.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-white border border-amber-200 rounded-lg px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-amber-400 transition-colors"
                    >
                      <Paperclip className="w-3 h-3 text-amber-500" />
                      <span className="truncate max-w-[180px]">{u.fileName}</span>
                      <span className="text-gray-400 shrink-0">{formatSize(u.fileSize)}</span>
                    </a>
                  )}
                </div>
              )}

              <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(u.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ActionPanel({ items, token }) {
  const [loadingId,   setLoadingId]   = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const router = useRouter()

  if (items.length === 0) return null

  // Milestones have 'title'. Updates have 'text'.
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
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-5 h-5 text-amber-600" />
        <h2 className="font-bold text-amber-900">Items Awaiting Your Review</h2>
      </div>

      <div className="space-y-4">
        {items.map((item) => {
          const type        = getType(item)
          const isRejecting = rejectingId === item.id
          const isLoading   = loadingId   === item.id

          // milestoneUpdates only exists on milestone items (not updates)
          const workLog = item.milestoneUpdates ?? []

          return (
            <div key={item.id} className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm">

              {/* Item title + buttons */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {item.title || item.text}
                  </p>
                  <p className="text-xs text-gray-400 italic mt-0.5">
                    Ready for your sign-off.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Request Changes button */}
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
                    className="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    {isRejecting ? 'Cancel' : 'Request Changes'}
                  </button>

                  {/* Approve button */}
                  <button
                    onClick={() => handleApprove(item.id, type)}
                    disabled={isLoading || isRejecting}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                  >
                    {isLoading && !isRejecting
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <CheckCircle className="w-4 h-4" />
                    }
                    Approve
                  </button>
                </div>
              </div>

              {/* Work log — only milestone items have this */}
              <WorkContext updates={workLog} />

              {/* Reject reason form */}
              {isRejecting && (
                <div className="mt-4 pt-4 border-t border-amber-100">
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
                    What needs to change?
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. The colour scheme doesn't match our brand. Please use #003366."
                    rows={3}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-200 resize-none"
                  />
                  <button
                    onClick={() => handleReject(item.id, type)}
                    disabled={isLoading}
                    className="mt-2 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                  >
                    {isLoading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <ChevronDown className="w-4 h-4" />
                    }
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