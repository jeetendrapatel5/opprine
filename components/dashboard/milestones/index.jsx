// components/dashboard/milestones/index.jsx
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

  // ── Drag state ────────────────────────────────────────────────────────────
  // dragId  = the milestone currently being dragged
  // overId  = the milestone the dragged item is hovering over (drop target)
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)

  // Called when a drag starts on a row
  const handleDragStart = (id) => {
    setDragId(id)
  }

  // Called when the dragged row passes over another row
  // e.preventDefault() is required — without it the browser blocks the drop
  const handleDragOver = (e, id) => {
    e.preventDefault()
    setOverId(id)
  }

  // Called when the drag ends without dropping on a valid target
  // (e.g. user drops outside the list) — clears visual state
  const handleDragEnd = () => {
    setDragId(null)
    setOverId(null)
  }

  // Called when the dragged row is dropped onto a target row
  // Steps:
  //   1. Find the from/to positions in the array
  //   2. Splice the array to move the item
  //   3. Update local state immediately (feels instant)
  //   4. Call API to persist the new order in the database
  const handleDrop = async (targetId) => {
    if (!dragId || dragId === targetId) {
      setDragId(null)
      setOverId(null)
      return
    }

    const from = milestones.findIndex(m => m.id === dragId)
    const to   = milestones.findIndex(m => m.id === targetId)

    // Build the new order — splice moves the item from its old position to the new one
    const next = [...milestones]
    next.splice(to, 0, next.splice(from, 1)[0])

    setMilestones(next)
    setDragId(null)
    setOverId(null)

    // Persist to database — send ordered IDs, route assigns order = index
    try {
      await axios.patch('/api/milestones/reorder', {
        orderedIds: next.map(m => m.id),
      })
    } catch {
      alert('Could not save new order. Please refresh.')
    }
  }

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
        order: milestones.length, // next position
      })
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
        {/* Hint that rows are draggable — appears as muted helper text */}
        {milestones.length > 1 && (
          <span className="ml-auto text-[10px] text-fp-text-tertiary">
            Drag to reorder
          </span>
        )}
      </div>

      {/* Milestone list */}
      <div className="space-y-2 mb-5">
        {milestones.length === 0 && (
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
            // ── Drag props ──
            // isDragging   = this row is the one being dragged (make it semi-transparent)
            // isOver       = this row is the current drop target (show accent border)
            // These are computed here so MilestoneRow stays a pure display component
            isDragging={dragId === milestone.id}
            isOver={overId === milestone.id && dragId !== milestone.id}
            onDragStart={() => handleDragStart(milestone.id)}
            onDragOver={(e) => handleDragOver(e, milestone.id)}
            onDrop={() => handleDrop(milestone.id)}
            onDragEnd={handleDragEnd}
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