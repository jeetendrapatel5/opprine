// components/ProjectMembersPanel.jsx
//
// "Who's on this project" + assign-teammate UI, opened from the project
// page's sidebar via the "Project members" panel button (see
// app/dashboard/projects/[id]/page.jsx, the
// <ProjectPanelDialog panelId="members"> block). That dialog already
// renders the title, description, and frame, so this component only
// renders the add-teammate control and the member list.
//
// PERMISSIONS: this component never decides who is allowed to do what.
// GET /api/projects/[id]/members returns `canManage`, computed on the
// server with can(role, 'manageStaffing') from lib/project-permissions.js,
// and this panel just follows it.
//   canManage = true  (workspace OWNER / ADMIN, or PROJECT_MANAGER)
//     -> Add button, assign form, remove buttons
//   canManage = false (CONTRIBUTOR)
//     -> read-only list of names and roles; own row is marked "(you)"
//   A VIEWER gets a 403 from the API (can() allows them nothing yet), so
//   they see the "no access" message instead of the list.
// Hiding buttons is only a convenience. The API enforces the same rules,
// so a direct POST or DELETE from a Contributor still gets a 403.
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
  // ── Data that comes from the server ────────────────────────────────
  const [members, setMembers] = useState(null) // null = still loading
  const [canManage, setCanManage] = useState(false) // server's answer
  const [currentUserId, setCurrentUserId] = useState(null) // to mark "(you)"
  const [loadError, setLoadError] = useState(null) // text, or null

  // Only fetched when canManage is true (needed for the Add dropdown).
  const [workspaceMembers, setWorkspaceMembers] = useState(null)

  // ── Small UI state ─────────────────────────────────────────────────
  const [isAdding, setIsAdding] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState('CONTRIBUTOR')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingUserId, setPendingUserId] = useState(null)

  // Fetches the member list AND the permission flag in one request.
  // Never throws: failures turn into `loadError`, so the panel shows a
  // message instead of "Loading…" forever.
  const loadMembers = useCallback(async () => {
    try {
      const { data } = await axios.get(`/api/projects/${projectId}/members`)
      setMembers(data.members)
      setCanManage(Boolean(data.canManage))
      setCurrentUserId(data.currentUserId ?? null)
      setLoadError(null)
    } catch (error) {
      const status = error.response?.status
      setCanManage(false)
      setLoadError(
        status === 403 || status === 404
          ? "You don't have access to this project's members."
          : 'Could not load project members.'
      )
    }
  }, [projectId])

  // Runs when the panel opens (and if projectId changes).
  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  // Load the workspace's people only for someone who can assign them.
  // A Contributor never triggers this request.
  useEffect(() => {
    if (!canManage) {
      setWorkspaceMembers(null)
      return
    }
    axios
      .get('/api/workspace/members')
      .then(({ data }) => setWorkspaceMembers(data.members))
      .catch(() => alert('Could not load workspace members.'))
  }, [canManage])

  // Workspace people who are not yet on this project.
  const availableToAdd = (workspaceMembers ?? []).filter(
    (wm) => !(members ?? []).some((m) => m.userId === wm.userId)
  )

  // Shows WHY the server said no. For 400 / 403 / 404 the API sends a
  // clear message (for example "This is the only Project Manager on this
  // project..."), so we show that text instead of guessing. After a 403
  // we also reload: if the person was demoted while the panel was open,
  // the Add and remove buttons disappear.
  const reportMutationError = async (error, fallbackMessage) => {
    const status = error.response?.status
    const serverMessage = [400, 403, 404].includes(status)
      ? error.response?.data?.error
      : null
    alert(serverMessage || fallbackMessage)
    if (status === 403) await loadMembers()
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!canManage || !selectedUserId) return // UI guard only; the API is the real lock
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
    } catch (error) {
      await reportMutationError(error, 'Could not add this person to the project.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemove = async (userId) => {
    if (!canManage) return // UI guard only; the API is the real lock
    setPendingUserId(userId)
    try {
      await axios.delete(`/api/projects/${projectId}/members/${userId}`)
      await loadMembers()
    } catch (error) {
      await reportMutationError(error, 'Could not remove this person from the project.')
    } finally {
      setPendingUserId(null)
    }
  }

  // The server said no (403/404) or the request failed: show why, nothing else.
  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <Users className="w-4 h-4 text-fp-text-tertiary" />
        <p className="text-xs text-fp-text-tertiary">{loadError}</p>
      </div>
    )
  }

  return (
    <div>
      {/* Top bar. Same height for everyone so the layout never jumps. */}
      <div className="flex items-center justify-end h-8 pr-9">
        {members !== null && !canManage && (
          <p className="mr-auto text-[10px] text-fp-text-tertiary">
            Only a project manager or workspace owner can change who&apos;s on this project.
          </p>
        )}
        {canManage && (
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
        )}
      </div>
      <div className="w-full border-b border-fp-border" />

      {/* Assign form: only exists in the page when canManage is true. */}
      {canManage && isAdding && (
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
          <p className="text-xs text-fp-text-tertiary">No one&apos;s staffed on this project yet.</p>
        </div>
      )}

      {members && members.length > 0 && (
        <ul className="divide-y divide-fp-border">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between py-2.5 group">
              <div className="min-w-0">
                <p className="text-xs font-medium text-fp-text-primary truncate">
                  {m.name || m.email}
                  {m.userId === currentUserId && (
                    <span className="font-normal text-fp-text-tertiary"> (you)</span>
                  )}
                </p>
                <p className="text-[10px] text-fp-text-tertiary">{ROLE_LABELS[m.role] ?? m.role}</p>
              </div>

              {/* Remove button: only rendered when canManage is true. */}
              {canManage && (
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
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}