// components/dashboard/milestones/index.jsx
// ─────────────────────────────────────────────────────────────────────────────
// MilestoneManager — the orchestrator component for the milestone system.
// Owns the local milestone list state and all API calls.
// Renders a list of MilestoneRow components and the "Add milestone" form.
//
// Why this component exists:
//   The project page is a Server Component (fetches data on server).
//   But the milestone list needs to update without full page reloads
//   (adding, deleting, status change). So this Client Component receives
//   `initialMilestones` as a prop from the server, owns the list in local state,
//   and mutates that state directly after each API call — no router.refresh().
//
// nextStatusMap: When the freelancer clicks the status icon, the milestone
// advances to the next logical status. The exception is IN_REVIEW: clicking
// it goes back to IN_PROGRESS (meaning "I'm continuing work"). COMPLETED
// goes back to PENDING as an intentional reset (unlikely to be used often).
// ─────────────────────────────────────────────────────────────────────────────
'use client'

import { useState } from 'react'
import axios from 'axios'
import { Plus, Loader2, ListTodo } from 'lucide-react'
import MilestoneRow from './MilestoneRow'

const nextStatusMap = {
  PENDING:     'IN_PROGRESS',
  IN_PROGRESS: 'IN_REVIEW',
  IN_REVIEW:   'IN_PROGRESS',
  COMPLETED:   'PENDING',
}

export default function MilestoneManager({
  projectId,
  initialMilestones,
  freelancerName,
  clientName,
}) {
  const [milestones, setMilestones] = useState(initialMilestones ?? [])
  const [newTitle,   setNewTitle]   = useState('')
  const [isAdding,   setIsAdding]   = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // ── Status advance ────────────────────────────────────────────────────────
  const handleStatusChange = async (milestoneId, currentStatus) => {
    const nextStatus = nextStatusMap[currentStatus]
    setUpdatingId(milestoneId)
    try {
      const response = await axios.patch(`/api/milestones/${milestoneId}`, {
        status: nextStatus,
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

  // ── Full milestone replace (after DeliveryModal submit) ───────────────────
  // The DeliveryModal already called the API. It passes back the full updated
  // milestone object. We spread existing (keeping relations like milestoneUpdates)
  // then overwrite with new scalar fields from the API response.
  const handleMilestoneUpdate = (updatedMilestone) => {
    setMilestones(prev =>
      prev.map(m => m.id === updatedMilestone.id ? { ...m, ...updatedMilestone } : m)
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

  // ── Add ───────────────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setIsAdding(true)
    try {
      const response = await axios.post('/api/milestones', {
        projectId,
        title: newTitle.trim(),
      })
      // New milestone starts with empty relations — add them so MilestoneRow
      // doesn't have to handle undefined milestoneUpdates / messages arrays.
      setMilestones(prev => [...prev, { ...response.data, milestoneUpdates: [], messages: [] }])
      setNewTitle('')
    } catch {
      alert('Failed to add milestone.')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="bg-fp-surface border border-fp-border rounded-xl p-5">

      {/* Section heading */}
      <div className="flex items-center gap-2 mb-5">
        <ListTodo className="w-4 h-4 text-fp-text-tertiary" />
        <h2 className="text-fp-text-secondary text-xs font-bold uppercase tracking-widest">
          Milestones
        </h2>
      </div>

      {/* Milestone list */}
      <div className="space-y-2 mb-5">
        {milestones.length === 0 && (
          // Empty state — invitation, not error
          <div className="border border-dashed border-fp-border rounded-xl py-8 text-center">
            <p className="text-fp-text-tertiary text-xs">
              No milestones yet. Add the first step below.
            </p>
          </div>
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

      {/* Add milestone form */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a milestone — e.g. Homepage design, Final handoff..."
          disabled={isAdding}
          className="
            flex-1 bg-fp-raised border border-fp-border text-fp-text-primary
            text-sm rounded-lg px-3 py-2
            placeholder:text-fp-text-tertiary
            focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/50
            disabled:opacity-50 transition-colors duration-150
          "
        />
        <button
          type="submit"
          disabled={isAdding || !newTitle.trim()}
          className="
            flex items-center gap-1.5 shrink-0
            bg-fp-accent hover:bg-fp-accent-hover text-fp-base
            text-xs font-bold px-3 py-2 rounded-lg
            transition-colors duration-150 disabled:opacity-50 cursor-pointer
          "
        >
          {isAdding
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Plus    className="w-3.5 h-3.5" />
          }
          Add
        </button>
      </form>

    </div>
  )
}