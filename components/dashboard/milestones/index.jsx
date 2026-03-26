// components/dashboard/milestones/index.jsx
'use client'

import { useState } from 'react'
import axios from 'axios'
import { Plus, Loader2 } from 'lucide-react'
import MilestoneRow from './MilestoneRow'

const nextStatusMap = {
  PENDING:     'IN_PROGRESS',
  IN_PROGRESS: 'IN_REVIEW',
  IN_REVIEW:   'IN_PROGRESS',
  COMPLETED:   'PENDING',
}

export default function MilestoneManager({ projectId, initialMilestones, freelancerName, clientName }) {
  const [milestones, setMilestones] = useState(initialMilestones ?? [])
  const [newTitle,   setNewTitle]   = useState('')
  const [isAdding,   setIsAdding]   = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // ── Status toggle ─────────────────────────────────────────────────────────
  // Used when the freelancer clicks the status icon directly on the row.
  // This function calls the API itself and updates one field (status) in state.
  const handleStatusChange = async (milestoneId, currentStatus) => {
    const nextStatus = nextStatusMap[currentStatus]
    setUpdatingId(milestoneId)
    try {
      const response = await axios.patch(`/api/milestones/${milestoneId}`, {
        status: nextStatus
      })
      setMilestones(prev =>
        prev.map(m => m.id === milestoneId ? { ...m, status: response.data.status } : m)
      )
    } catch {
      alert('Could not update status. Please try again.')
    } finally {
      setUpdatingId(null)
    }
  }

  // ── Full milestone replace ────────────────────────────────────────────────
  // Used when the DeliveryModal submits successfully.
  // The modal already called the API and received the full updated milestone
  // object back. We don't call the API again here — we just slot the new
  // object into the array in place of the old one.
  //
  // WHY a separate function: handleStatusChange only merges { status }.
  // After a delivery submission, we need to merge ALL the new fields:
  // status, deliveryHeadline, deliverySummary, deliveryChecklist, etc.
  // Replacing the whole object is cleaner than merging individual fields.
  const handleMilestoneUpdate = (updatedMilestone) => {
    setMilestones(prev =>
      prev.map(m => m.id === updatedMilestone.id
        // Spread the existing milestone first, then overwrite with updated fields.
        // WHY: The API response from the PATCH route returns the Prisma milestone
        // record, which does NOT include milestoneUpdates or messages (those are
        // relations, not scalar fields). So we keep the existing relations from
        // the old object and only overwrite what the API returned.
        ? { ...m, ...updatedMilestone }
        : m
      )
    )
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (milestoneId) => {
    if (!confirm('Delete this milestone and all its updates?')) return
    setDeletingId(milestoneId)
    try {
      await axios.delete(`/api/milestones/${milestoneId}`)
      setMilestones(prev => prev.filter(m => m.id !== milestoneId))
    } catch {
      alert('Failed to delete milestone.')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Add new milestone ─────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setIsAdding(true)
    try {
      const response = await axios.post('/api/milestones', {
        projectId,
        title: newTitle.trim()
      })
      setMilestones(prev => [...prev, { ...response.data, milestoneUpdates: [], messages: [] }])
      setNewTitle('')
    } catch {
      alert('Failed to add milestone. Please try again.')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Milestones</h2>

      <div className="space-y-2 mb-6">
        {milestones.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6 border-2 border-dashed border-gray-100 rounded-xl">
            No milestones yet. Add your first step below.
          </p>
        )}

        {milestones.map((milestone) => (
          <MilestoneRow
            key={milestone.id}
            milestone={milestone}
            onStatusChange={handleStatusChange}
            onMilestoneUpdate={handleMilestoneUpdate}
            onDelete={handleDelete}
            isUpdating={updatingId === milestone.id}
            isDeleting={deletingId === milestone.id}
            freelancerName={freelancerName}
            clientName={clientName}
          />
        ))}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="e.g. Homepage design, Final handoff..."
          className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
          disabled={isAdding}
        />
        <button
          type="submit"
          disabled={isAdding || !newTitle.trim()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
        >
          {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add Step
        </button>
      </form>
    </div>
  )
}