// components/dashboard/milestones/TaskBoard.jsx
//
// Task board for a single milestone — rendered inside MilestoneRow's
// expanded panel, next to "Conversation" and "Add Update". Moved here
// from components/TaskBoard.jsx and restyled to match fp-* tokens +
// axios, after seeing MilestoneRow.jsx and index.jsx (MilestoneManager)
// for real. The original version used generic slate/red Tailwind
// classes and native fetch, matching neither convention.
//
// No outer "Tasks" heading in here on purpose — same pattern as
// MilestoneUpdateFeed/MilestoneUpdateForm: the section label lives in
// the parent (MilestoneRow), this component only renders the content.
//
// Usage: <TaskBoard milestoneId={milestone.id} projectId={milestone.projectId} />
// projectId comes straight off the milestone object — Milestone.projectId
// is a plain scalar column, already present on every milestone object
// MilestoneManager holds (Prisma's `include` returns all scalars by
// default) — no extra prop-threading needed through MilestoneManager.

'use client'

import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Plus, Loader2, Trash2 } from 'lucide-react'

const STATUSES = [
  { value: 'TODO', label: 'To do' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'DONE', label: 'Done' },
]

export default function TaskBoard({ milestoneId, projectId }) {
  const [tasks, setTasks] = useState(null)
  const [projectMembers, setProjectMembers] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newAssigneeId, setNewAssigneeId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingTaskId, setPendingTaskId] = useState(null)

  const loadTasks = useCallback(async () => {
    const { data } = await axios.get('/api/tasks', { params: { milestoneId } })
    setTasks(data)
  }, [milestoneId])

  useEffect(() => {
    loadTasks().catch(() => alert('Could not load tasks.'))
    axios
      .get(`/api/projects/${projectId}/members`)
      .then(({ data }) => setProjectMembers(data.members))
      .catch(() => alert('Could not load project members.'))
  }, [loadTasks, projectId])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setIsSubmitting(true)
    try {
      await axios.post('/api/tasks', {
        milestoneId,
        title: newTitle.trim(),
        assignedToId: newAssigneeId || undefined,
      })
      await loadTasks()
      setNewTitle('')
      setNewAssigneeId('')
      setIsCreating(false)
    } catch {
      alert('Could not create task.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateTask = async (taskId, patch) => {
    setPendingTaskId(taskId)
    try {
      await axios.patch(`/api/tasks/${taskId}`, patch)
      await loadTasks()
    } catch {
      alert('Could not update task.')
    } finally {
      setPendingTaskId(null)
    }
  }

  const handleDelete = async (taskId) => {
    if (!confirm('Delete this task?')) return
    setPendingTaskId(taskId)
    try {
      await axios.delete(`/api/tasks/${taskId}`)
      await loadTasks()
    } catch {
      alert('Could not delete task.')
    } finally {
      setPendingTaskId(null)
    }
  }

  if (tasks === null) {
    return (
      <div className="flex items-center gap-2 text-xs text-fp-text-tertiary py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading tasks…
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-fp-text-tertiary">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={() => setIsCreating((v) => !v)}
          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-fp-accent hover:text-fp-accent-hover transition-colors duration-150"
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
          className="flex flex-wrap items-end gap-2 mb-4 bg-fp-raised border border-fp-border rounded-lg p-3"
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
          <select
            value={newAssigneeId}
            onChange={(e) => setNewAssigneeId(e.target.value)}
            disabled={isSubmitting}
            className="
              bg-fp-base border border-fp-border text-fp-text-secondary
              text-xs rounded-lg px-2.5 py-2
              focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/50
              disabled:opacity-50
            "
          >
            <option value="">Unassigned</option>
            {(projectMembers ?? []).map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name || m.email}
              </option>
            ))}
          </select>
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {STATUSES.map((column) => {
          const columnTasks = tasks.filter((t) => t.status === column.value)
          return (
            <div key={column.value} className="bg-fp-raised border border-fp-border rounded-xl overflow-hidden">
              <div className="px-2.5 py-2 border-b border-fp-border">
                <p className="text-[10px] font-bold uppercase tracking-widest text-fp-text-tertiary">
                  {column.label} · {columnTasks.length}
                </p>
              </div>
              <div className="p-1.5 space-y-1.5">
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
                      <select
                        value={task.status}
                        onChange={(e) => updateTask(task.id, { status: e.target.value })}
                        disabled={pendingTaskId === task.id}
                        className="
                          text-[10px] bg-fp-raised border border-fp-border text-fp-text-secondary
                          rounded px-1 py-1 disabled:opacity-50
                          focus:outline-none focus:ring-1 focus:ring-fp-accent/30
                        "
                      >
                        {STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleDelete(task.id)}
                        disabled={pendingTaskId === task.id}
                        className="
                          opacity-0 group-hover:opacity-100 transition-opacity duration-150
                          text-fp-text-tertiary hover:text-fp-danger shrink-0
                        "
                      >
                        {pendingTaskId === task.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Trash2 className="w-3 h-3" />
                        }
                      </button>
                    </div>
                  </div>
                ))}
                {columnTasks.length === 0 && (
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