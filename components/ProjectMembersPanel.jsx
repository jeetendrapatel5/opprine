// components/ProjectMembersPanel.jsx
//
// "Who's on this project" + assign-teammate UI, opened from the project
// page's sidebar via the "Project members" panel button (see
// app/dashboard/projects/[id]/page.jsx, the
// <ProjectPanelDialog panelId="members"> block). That dialog already
// renders the "Project members" title, description, and dimmed/bordered
// frame — same pattern RecentActivityPanel uses for the "activity"
// panel — so this component only renders the add-teammate control and
// the member list, not its own card shell or repeated heading.
//
// Restyled to match fp-* design tokens and axios after seeing the real
// files (page.jsx, MilestoneRow.jsx) — the original version used generic
// slate/red Tailwind classes and native fetch, matching neither
// convention.
//
// Usage: <ProjectMembersPanel projectId={project.id} /> inside
// <ProjectPanelDialog panelId="members">.

'use client'

import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Plus, Loader2, Trash2, Users } from 'lucide-react'

const ROLE_LABELS = {
  PROJECT_MANAGER: 'Project Manager',
  CONTRIBUTOR: 'Contributor',
  VIEWER: 'Viewer',
}

export default function ProjectMembersPanel({ projectId }) {
  const [members, setMembers] = useState(null)
  const [workspaceMembers, setWorkspaceMembers] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState('CONTRIBUTOR')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingUserId, setPendingUserId] = useState(null)

  const loadMembers = useCallback(async () => {
    const { data } = await axios.get(`/api/projects/${projectId}/members`)
    setMembers(data.members)
  }, [projectId])

  useEffect(() => {
    loadMembers().catch(() => alert('Could not load project members.'))
    axios
      .get('/api/workspace/members')
      .then(({ data }) => setWorkspaceMembers(data.members))
      .catch(() => alert('Could not load workspace members.'))
  }, [loadMembers])

  const availableToAdd = (workspaceMembers ?? []).filter(
    (wm) => !(members ?? []).some((m) => m.userId === wm.userId)
  )

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!selectedUserId) return
    setIsSubmitting(true)
    try {
      await axios.post(`/api/projects/${projectId}/members`, {
        userId: selectedUserId,
        role: selectedRole,
      })
      await loadMembers()
      setIsAdding(false)
      setSelectedUserId('')
      setSelectedRole('CONTRIBUTOR')
    } catch {
      alert('Could not add this person to the project.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemove = async (userId) => {
    setPendingUserId(userId)
    try {
      await axios.delete(`/api/projects/${projectId}/members/${userId}`)
      await loadMembers()
    } catch {
      alert('Could not remove this person from the project.')
    } finally {
      setPendingUserId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end h-8 pr-9">
        <button
          type="button"
          onClick={() => setIsAdding((v) => !v)}
          className="flex items-center cursor-pointer gap-1 leading-none text-[10px] font-bold uppercase tracking-wider text-fp-accent hover:text-fp-accent-hover transition-colors duration-150"
        >
          {isAdding ? (
            'Cancel'
          ) : (
            <>
              <Plus className="w-3 h-3" />
              Add
            </>
          )}
        </button>
      </div>
      <div className="w-full border-b border-fp-border" />

      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="flex flex-wrap items-center gap-2 py-3 border-b border-fp-border"
        >
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            disabled={isSubmitting}
            className="
              flex-1 min-w-[140px] bg-fp-base border border-fp-border text-fp-text-secondary
              text-xs rounded-lg px-2.5 py-2
              focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/50
              disabled:opacity-50 cursor-pointer
            "
          >
            <option value="">Select someone…</option>
            {availableToAdd.map((wm) => (
              <option key={wm.userId} value={wm.userId}>
                {wm.name || wm.email}
              </option>
            ))}
          </select>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            disabled={isSubmitting}
            className="
              bg-fp-base border border-fp-border text-fp-text-secondary
              text-xs rounded-lg px-2.5 py-2
              focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/50
              disabled:opacity-50 cursor-pointer
            "
          >
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!selectedUserId || isSubmitting}
            className="
              flex items-center gap-0.5 shrink-0
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

      {members === null && (
        <div className="flex items-center gap-2 text-xs text-fp-text-tertiary py-4">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading…
        </div>
      )}

      {members?.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <Users className="w-4 h-4 text-fp-text-tertiary" />
          <p className="text-xs text-fp-text-tertiary">No one's staffed on this project yet.</p>
        </div>
      )}

      {members && members.length > 0 && (
        <ul className="divide-y divide-fp-border">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between py-2.5 group">
              <div className="min-w-0">
                <p className="text-xs font-medium text-fp-text-primary truncate">{m.name || m.email}</p>
                <p className="text-[10px] text-fp-text-tertiary">{ROLE_LABELS[m.role] ?? m.role}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(m.userId)}
                disabled={pendingUserId === m.userId}
                className="
                  opacity-0 group-hover:opacity-100 transition-opacity duration-150
                  text-fp-text-tertiary hover:text-fp-danger p-1 rounded shrink-0 cursor-pointer
                "
              >
                {pendingUserId === m.userId
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />
                }
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}