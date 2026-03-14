// components/portal/ActionPanel.jsx
"use client"
import { useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, Loader2, ChevronDown } from 'lucide-react'
import axios from 'axios'
import { useRouter } from 'next/navigation'

export default function ActionPanel({ items, token }) {
  // loadingId tracks WHICH item's button is currently spinning
  const [loadingId, setLoadingId] = useState(null)

  // rejectingId tracks WHICH item has the reject reason box open
  // When this equals an item's id, we show the textarea for that item
  const [rejectingId, setRejectingId] = useState(null)

  // The actual reason text the client types before submitting rejection
  const [rejectReason, setRejectReason] = useState('')

  const router = useRouter()

  // If there's nothing to review, render nothing at all
  if (items.length === 0) return null

  // Figures out the type based on which field the item has.
  // Milestones have 'title'. Updates have 'text'.
  const getType = (item) => item.title ? 'milestone' : 'update'

  // Called when client clicks "Approve"
  const handleApprove = async (itemId, type) => {
    setLoadingId(itemId)
    try {
      await axios.patch(`/api/portal/${token}/approve`, {
        itemId,
        type,
        action: 'approve',
      })
      router.refresh() // Re-runs the Server Component, re-fetches fresh DB data
    } catch {
      alert("Failed to approve. Please try again.")
    } finally {
      setLoadingId(null)
    }
  }

  // Called when client submits the rejection form
  const handleReject = async (itemId, type) => {
    // Don't allow empty reason — the client must explain what needs changing
    if (!rejectReason.trim()) {
      alert("Please describe what needs to change.")
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
      // Close the reject form and clear reason
      setRejectingId(null)
      setRejectReason('')
      router.refresh()
    } catch {
      alert("Failed to submit feedback. Please try again.")
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

      <div className="space-y-3">
        {items.map((item) => {
          const type = getType(item)
          const isRejecting = rejectingId === item.id
          const isLoading = loadingId === item.id

          return (
            <div
              key={item.id}
              className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm"
            >
              {/* Top row: item label + action buttons */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {/* Milestones have 'title', updates have 'text' */}
                    {item.title || item.text}
                  </p>
                  <p className="text-xs text-gray-400 italic mt-0.5">
                    Ready for your sign-off.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* REJECT button — opens the reason textarea below */}
                  <button
                    onClick={() => {
                      // Toggle: if already open for this item, close it
                      if (isRejecting) {
                        setRejectingId(null)
                        setRejectReason('')
                      } else {
                        setRejectingId(item.id)
                        setRejectReason('')
                      }
                    }}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    {isRejecting ? 'Cancel' : 'Request Changes'}
                  </button>

                  {/* APPROVE button */}
                  <button
                    onClick={() => handleApprove(item.id, type)}
                    disabled={isLoading || isRejecting}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                  >
                    {isLoading && !isRejecting
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <CheckCircle className="w-4 h-4" />
                    }
                    Approve
                  </button>
                </div>
              </div>

              {/* Reject reason form — only visible when this item's reject button was clicked */}
              {isRejecting && (
                <div className="mt-4 pt-4 border-t border-amber-100">
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
                    What needs to change?
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. The colour scheme doesn't match our brand. Please use #003366 instead of the current blue."
                    rows={3}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300 resize-none"
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
