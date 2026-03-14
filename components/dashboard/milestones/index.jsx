// components/dashboard/milestones/index.jsx
// This is the entry point for the milestone feature.
// It manages the list of milestones and delegates rendering each one to MilestoneRow.
'use client'

import { useState } from 'react'
import axios from 'axios'
import { Plus, Loader2 } from 'lucide-react'
import MilestoneRow from './MilestoneRow'

// What status comes after the current one when the freelancer clicks the icon
const nextStatusMap = {
  PENDING:     'IN_PROGRESS',
  IN_PROGRESS: 'IN_REVIEW',
  IN_REVIEW:   'IN_PROGRESS',  // Back to in-progress if freelancer clicks again
  COMPLETED:   'PENDING',       // Cycle back (for accidental completions)
}

export default function MilestoneManager({ projectId, initialMilestones }) {
  // milestones is the source of truth for the list
  // Starts from server-fetched data, mutated locally for instant UI feedback
  const [milestones, setMilestones] = useState(initialMilestones ?? [])
  const [newTitle,   setNewTitle]   = useState('')
  const [isAdding,   setIsAdding]   = useState(false)

  // Track which milestone ID is currently having its status updated
  const [updatingId, setUpdatingId] = useState(null)
  // Track which milestone ID is being deleted
  const [deletingId, setDeletingId] = useState(null)

  // ── Status toggle ─────────────────────────────────────────────────────────
  const handleStatusChange = async (milestoneId, currentStatus) => {
    const nextStatus = nextStatusMap[currentStatus]
    setUpdatingId(milestoneId)
    try {
      const response = await axios.patch(`/api/milestones/${milestoneId}`, {
        status: nextStatus
      })
      // Update only this milestone in the array, keep everything else
      setMilestones((prev) =>
        prev.map((m) => m.id === milestoneId ? { ...m, status: response.data.status } : m)
      )
    } catch {
      alert('Could not update status. Please try again.')
    } finally {
      setUpdatingId(null)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (milestoneId) => {
    if (!confirm('Delete this milestone and all its updates?')) return
    setDeletingId(milestoneId)
    try {
      await axios.delete(`/api/milestones/${milestoneId}`)
      setMilestones((prev) => prev.filter((m) => m.id !== milestoneId))
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
      // New milestones start with no updates, so we attach an empty array
      setMilestones((prev) => [...prev, { ...response.data, milestoneUpdates: [] }])
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

      {/* Milestone rows */}
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
            onDelete={handleDelete}
            isUpdating={updatingId === milestone.id}
            isDeleting={deletingId === milestone.id}
          />
        ))}
      </div>

      {/* Add milestone form */}
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