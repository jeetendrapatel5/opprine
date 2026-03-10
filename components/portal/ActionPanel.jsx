"use client"
import { useState } from 'react'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import axios from 'axios'
import { useRouter } from 'next/navigation'

export default function ActionPanel({ items, token }) {
  const [loadingId, setLoadingId] = useState(null)
  const router = useRouter()

  if (items.length === 0) return null

  const handleApprove = async (itemId, type) => {
    setLoadingId(itemId)
    try {
      await axios.patch(`/api/portal/${token}/approve`, { itemId, type })
      router.refresh() // Refreshes Server Component data
    } catch (err) {
      alert("Failed to approve item.")
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
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
            <div className="flex-1 pr-4">
              <p className="text-sm font-semibold text-gray-900">
                {item.title || item.text}
              </p>
              <p className="text-xs text-gray-500 italic mt-0.5">
                The freelancer has marked this as ready for your sign-off.
              </p>
            </div>
            
            <button
              onClick={() => handleApprove(item.id, item.title ? 'milestone' : 'update')}
              disabled={!!loadingId}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
            >
              {loadingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Approve
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}