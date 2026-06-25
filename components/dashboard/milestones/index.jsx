// components/dashboard/milestones/index.jsx
'use client'

import { useState } from 'react'
import axios from 'axios'
import { Plus, Loader2, ListTodo } from 'lucide-react'
import MilestoneRow from './MilestoneRow'

// ── Status cycle map ───────────────────────────────────────────────────────
// Clicking "advance" on a milestone moves it to the next logical state.
// IN_REVIEW goes back to IN_PROGRESS (not forward) because approval
// is a client action, not a freelancer action.
const nextStatusMap = {
  PENDING:     'IN_PROGRESS',
  IN_PROGRESS: 'IN_REVIEW',
  IN_REVIEW:   'IN_PROGRESS',
  COMPLETED:   'PENDING',
}

// Statuses that count toward completion in the progress bar
const DONE_STATUSES = new Set(['COMPLETED', 'APPROVED'])

export default function MilestoneManager({
  projectId,
  initialMilestones,
  freelancerName,
  clientName,
}) {
  const [milestones, setMilestones] = useState(initialMilestones ?? [])
  const [newTitle,   setNewTitle]   = useState('')
  const [isAdding,   setIsAdding]   = useState(false)
  const [updatingId, setUpdatingId] = useState(null)  // which row is mid-patch
  const [deletingId, setDeletingId] = useState(null)  // which row is being deleted

  // ── Drag state ─────────────────────────────────────────────────────────
  // dragId  = the milestone currently being dragged
  // overId  = the milestone the dragged item is hovering over (drop target)
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)

  // ── Derived progress stats ─────────────────────────────────────────────
  const total     = milestones.length
  const completed = milestones.filter((m) => DONE_STATUSES.has(m?.status)).length
  const progress  = total > 0 ? Math.round((completed / total) * 100) : 0

  // ── Drag handlers ──────────────────────────────────────────────────────

  const handleDragStart = (id) => {
    setDragId(id)
  }

  // e.preventDefault() is required — without it the browser blocks the drop event
  const handleDragOver = (e, id) => {
    e.preventDefault()
    setOverId(id)
  }

  // User dropped outside any valid target — reset visual state only
  const handleDragEnd = () => {
    setDragId(null)
    setOverId(null)
  }

  // User dropped the dragged row onto targetId.
  // Steps:
  //   1. Find from/to indices in the array
  //   2. splice() moves the item (mutates a copy, not the original)
  //   3. Optimistic update: apply to state immediately for instant feel
  //   4. Persist new order to database via PATCH /api/milestones/reorder
  const handleDrop = async (targetId) => {
    if (!dragId || dragId === targetId) {
      setDragId(null)
      setOverId(null)
      return
    }

    const from = milestones.findIndex((m) => m.id === dragId)
    const to   = milestones.findIndex((m) => m.id === targetId)
    const next = [...milestones]
    next.splice(to, 0, next.splice(from, 1)[0])

    setMilestones(next)
    setDragId(null)
    setOverId(null)

    try {
      await axios.patch('/api/milestones/reorder', {
        orderedIds: next.map((m) => m.id),
      })
    } catch {
      alert('Could not save new order. Please refresh.')
    }
  }

  // ── Status advance ─────────────────────────────────────────────────────
  // Cycles the milestone to the next status per nextStatusMap above.
  // Optimistically updates local state from the API response.
  const handleStatusChange = async (milestoneId, currentStatus) => {
    const nextStatus = nextStatusMap[currentStatus]
    setUpdatingId(milestoneId)
    try {
      const { data } = await axios.patch(`/api/milestones/${milestoneId}`, {
        status: nextStatus,
      })
      setMilestones((prev) =>
        prev.map((m) => m.id === milestoneId ? { ...m, status: data.status } : m)
      )
    } catch {
      alert('Could not update status. Please try again.')
    } finally {
      setUpdatingId(null)
    }
  }

  // ── Full milestone replace (after DeliveryModal submit) ────────────────
  // Called when a child component (e.g. DeliveryModal) returns a complete
  // updated milestone object after a form submission.
  const handleMilestoneUpdate = (updatedMilestone) => {
    setMilestones((prev) =>
      prev.map((m) => m.id === updatedMilestone.id ? { ...m, ...updatedMilestone } : m)
    )
  }

  // ── Delete ─────────────────────────────────────────────────────────────
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

  // ── Add ────────────────────────────────────────────────────────────────
  // Appends a new milestone at the end of the ordered list.
  // The API sets order = milestones.length (0-based index of the new item).
  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setIsAdding(true)
    try {
      const { data } = await axios.post('/api/milestones', {
        projectId,
        title: newTitle.trim(),
        order: milestones.length,
      })
      // Merge the API response with empty relations so MilestoneRow renders correctly
      setMilestones((prev) => [
        ...prev,
        { ...data, milestoneUpdates: [], messages: [] },
      ])
      setNewTitle('')
    } catch {
      alert('Failed to add milestone.')
    } finally {
      setIsAdding(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="bg-fp-surface rounded-xl overflow-hidden">

      {/* ── HEADER ──
          Shows the section title + a live progress bar + completion percentage.
          The drag hint is only shown when there are enough rows to reorder.
      ── */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-fp-border">
        <ListTodo className="w-3.5 h-3.5 text-fp-text-tertiary shrink-0" />
        <h2 className="text-[10px] font-bold text-fp-text-tertiary uppercase tracking-widest flex-1">
          Milestones
        </h2>

        {/* Right side: progress pill + drag hint */}
        {total > 0 && (
          <div className="flex items-center gap-3">
            {/* Mini inline progress bar */}
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 bg-fp-raised rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progress}%`,
                    background: 'var(--color-fp-accent)',
                  }}
                />
              </div>
              <span className="text-[10px] font-bold tabular-nums text-fp-accent">
                {progress}%
              </span>
            </div>
            {milestones.length > 1 && (
              <span className="text-[10px] text-fp-text-tertiary hidden sm:block">
                drag to reorder
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-5">

        {/* ── EMPTY STATE ── */}
        {milestones.length === 0 && (
          <div className="border border-dashed border-fp-border rounded-xl py-10 text-center mb-4">
            {/* Three placeholder dots as a visual stand-in for a milestone list */}
            <div className="flex justify-center gap-1.5 mb-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-fp-border/60" />
              ))}
            </div>
            <p className="text-fp-text-tertiary text-xs font-medium">No milestones yet</p>
            <p className="text-fp-text-tertiary text-[10px] mt-1">
              Add the first step below
            </p>
          </div>
        )}

        {/* ── MILESTONE LIST ── */}
        {milestones.length > 0 && (
          <div className="space-y-2 mb-4">
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
                // Drag props — computed here so MilestoneRow stays a pure display component:
                // isDragging: this row is being dragged → render it semi-transparent
                // isOver:     this row is the current drop target → render accent border
                isDragging={dragId === milestone.id}
                isOver={overId === milestone.id && dragId !== milestone.id}
                onDragStart={() => handleDragStart(milestone.id)}
                onDragOver={(e) => handleDragOver(e, milestone.id)}
                onDrop={() => handleDrop(milestone.id)}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        )}

        {/* ── ADD MILESTONE FORM ── */}
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="New milestone — e.g. Homepage design, Final handoff…"
            disabled={isAdding}
            className="
              flex-1 bg-fp-raised border border-fp-border text-fp-text-primary
              text-xs rounded-lg px-3 py-2.5
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
              text-xs font-bold px-3 py-2.5 rounded-lg
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
    </div>
  )
}