// components/dashboard/milestones/TaskBoard.jsx
//
// Task board for a single milestone — rendered inside MilestoneRow's
// expanded panel, next to "Conversation" and "Add Update". The section
// label ("Tasks") lives in the parent; this component only renders the
// content.
//
// CHANGED — data loading. Tasks and project members no longer live in
// this component's own useState. They come from ./taskStore, a small
// shared cache, so:
//   • the board (header + four columns) renders on the very first paint,
//     it never waits for /api/tasks;
//   • if the milestone was opened before (or MilestoneRow prefetched it
//     on hover), the real tasks show on that first paint too, and are
//     refreshed quietly in the background;
//   • tasks and members load independently of each other.
//
// CHANGED — mutations. Status changes and deletes update the screen
// first, then call the API, and roll back if the API fails. After every
// mutation the list is re-fetched in the background so the screen always
// converges on what the server says. API calls and payloads are exactly
// as before.
//
// currentUserId — used to identify "me" in the assignee dropdown AND to
// key the cache per user. The canDeleteAnyTask permission wiring from
// MilestoneRow's comments is still separate work, not part of this change.
//
// Usage: <TaskBoard milestoneId={milestone.id} projectId={milestone.projectId}
//          currentUserId={currentUserId} />

'use client'

import { useState, useMemo } from 'react'
import axios from 'axios'
import { Plus, Loader2, Trash2 } from 'lucide-react'
import AssigneeSelect from './AssigneeSelect'
import StatusSelect from './StatusSelect'
import {
  useTasks,
  useProjectMembers,
  updateCachedTasks,
  refreshTasks,
} from './taskStore'

const STATUSES = [
  { value: 'TODO', label: 'To do' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'DONE', label: 'Done' },
]

export default function TaskBoard({ milestoneId, projectId, currentUserId }) {
  // tasks === undefined means "nothing loaded yet" (cold load).
  const { data: tasks, error: tasksError, reload: reloadTasks } = useTasks(currentUserId, milestoneId)
  const { data: projectMembers } = useProjectMembers(currentUserId, projectId)

  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newAssigneeId, setNewAssigneeId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  // A Set (not one id) so two quick edits on different tasks don't
  // clear each other's "busy" state.
  const [pendingIds, setPendingIds] = useState(() => new Set())

  const isLoading = tasks === undefined

  // Group tasks by status once per change, instead of filtering 4 times per render.
  const columns = useMemo(() => {
    const groups = Object.fromEntries(STATUSES.map((s) => [s.value, []]))
    for (const task of tasks ?? []) {
      if (groups[task.status]) groups[task.status].push(task)
    }
    return groups
  }, [tasks])

  const setPending = (taskId, isPending) =>
    setPendingIds((prev) => {
      const next = new Set(prev)
      if (isPending) next.add(taskId)
      else next.delete(taskId)
      return next
    })

  // Edit the cached list on screen right now.
  const patchCache = (updater) => updateCachedTasks(currentUserId, milestoneId, updater)
  // Ask the server for the truth (runs in the background, never throws).
  const refresh = () => refreshTasks(currentUserId, milestoneId)

  const handleCreate = async (e) => {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    setIsSubmitting(true)
    try {
      const { data: created } = await axios.post('/api/tasks', {
        milestoneId,
        title,
        assignedToId: newAssigneeId || undefined,
      })
      // POST returns the bare task (no assignee name/email). With no
      // assignee we can show it immediately; with one, we let the refresh
      // below bring the full record so the name appears correctly.
      if (!newAssigneeId) {
        patchCache((list) => [...list, { ...created, assignedTo: null }])
      }
      setNewTitle('')
      setNewAssigneeId('')
      setIsCreating(false)
    } catch {
      alert('Could not create task.')
    } finally {
      setIsSubmitting(false)
      refresh()
    }
  }

  const updateTask = async (task, patch) => {
    // Remember the old values of ONLY the fields we are changing,
    // so a rollback can't undo someone else's change to other fields.
    const before = {}
    for (const key of Object.keys(patch)) before[key] = task[key]

    setPending(task.id, true)
    patchCache((list) => list.map((t) => (t.id === task.id ? { ...t, ...patch } : t)))
    try {
      await axios.patch(`/api/tasks/${task.id}`, patch)
    } catch {
      patchCache((list) => list.map((t) => (t.id === task.id ? { ...t, ...before } : t)))
      alert('Could not update task.')
    } finally {
      setPending(task.id, false)
      refresh()
    }
  }

  const handleDelete = async (task) => {
    if (!confirm('Delete this task?')) return
    setPending(task.id, true)
    patchCache((list) => list.filter((t) => t.id !== task.id))
    try {
      await axios.delete(`/api/tasks/${task.id}`)
    } catch {
      // Put it back; the refresh below then fixes its exact position.
      patchCache((list) => (list.some((t) => t.id === task.id) ? list : [...list, task]))
      alert('Could not delete task.')
    } finally {
      setPending(task.id, false)
      refresh()
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-fp-text-tertiary">
          {isLoading
            ? tasksError ? 'Tasks unavailable' : 'Loading tasks…'
            : `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`}
        </span>
        <button
          type="button"
          onClick={() => setIsCreating((v) => !v)}
          className="flex items-center gap-1 cursor-pointer text-[10px] font-bold uppercase tracking-wider text-fp-accent hover:text-fp-accent-hover transition-colors duration-150"
        >
          {isCreating ? (
            'Cancel'
          ) : (
            <>
              <Plus className="w-3 h-3" />
              Add task
            </>
          )}
        </button>
      </div>

      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="flex items-center flex-wrap gap-2 mb-3 bg-fp-raised border border-fp-border rounded-lg px-1.5 py-1"
        >
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="What needs doing?"
            disabled={isSubmitting}
            className="
              flex-1 min-w-[160px] bg-fp-base border border-fp-border text-fp-text-primary
              text-xs rounded-lg px-3 py-2
              placeholder:text-fp-text-tertiary
              focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/50
              disabled:opacity-50 transition-colors duration-150
            "
          />
          <AssigneeSelect
            members={projectMembers ?? []}
            value={newAssigneeId}
            onChange={setNewAssigneeId}
            currentUserId={currentUserId}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting || !newTitle.trim()}
            className="
              flex items-center gap-1.5 shrink-0
              bg-fp-accent hover:bg-fp-accent-hover text-fp-base
              text-xs font-bold px-3 py-2 rounded-lg
              transition-colors duration-150 disabled:opacity-50 cursor-pointer
            "
          >
            {isSubmitting
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Plus className="w-3.5 h-3.5" />
            }
            Add
          </button>
        </form>
      )}

      {/* Cold load failed and there is nothing cached to show: say so, and
          let the user retry. (If we DO have cached tasks, they stay on
          screen even when a background refresh fails.) */}
      {isLoading && tasksError && (
        <div className="flex items-center justify-between gap-2 mb-3 bg-fp-raised border border-fp-border rounded-lg px-3 py-2">
          <p className="text-xs text-fp-text-secondary">Could not load tasks.</p>
          <button
            type="button"
            onClick={reloadTasks}
            className="text-[10px] font-bold uppercase tracking-wider text-fp-accent hover:text-fp-accent-hover cursor-pointer transition-colors duration-150"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {STATUSES.map((column) => {
          const columnTasks = columns[column.value]
          return (
            <div key={column.value} className="bg-fp-raised border border-fp-border rounded-xl overflow-hidden">
              <div className="px-2.5 py-2 border-b border-fp-border">
                <p className="text-[10px] font-bold uppercase tracking-widest text-fp-text-tertiary">
                  {isLoading ? column.label : `${column.label} · ${columnTasks.length}`}
                </p>
              </div>
              <div className="p-1.5 space-y-1.5">
                {isLoading && !tasksError && (
                  <div className="h-14 rounded-lg bg-fp-surface border border-fp-border animate-pulse" />
                )}
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    className="group bg-fp-surface border border-fp-border rounded-lg p-2.5"
                  >
                    <p className="text-xs font-medium text-fp-text-primary leading-snug">
                      {task.title}
                    </p>
                    {task.assignedTo && (
                      <p className="text-[10px] text-fp-text-tertiary mt-1 truncate">
                        {task.assignedTo.name || task.assignedTo.email}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-1.5 mt-2">
                      <StatusSelect
                        statuses={STATUSES}
                        value={task.status}
                        onChange={(next) => updateTask(task, { status: next })}
                        disabled={pendingIds.has(task.id)}
                      />
                      <button
                        type="button"
                        onClick={() => handleDelete(task)}
                        disabled={pendingIds.has(task.id)}
                        className="
                          opacity-0 group-hover:opacity-100 transition-opacity duration-150
                          text-fp-text-tertiary hover:text-fp-danger shrink-0
                        "
                      >
                        {pendingIds.has(task.id)
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Trash2 className="w-3 h-3" />
                        }
                      </button>
                    </div>
                  </div>
                ))}
                {!isLoading && columnTasks.length === 0 && (
                  <p className="text-[10px] text-fp-text-tertiary text-center py-3">Nothing here</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}