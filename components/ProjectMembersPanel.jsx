// components/ProjectMembersPanel.jsx
//
// "Who's on this project" + assign-teammate UI, opened from the project
// page's sidebar via the "Project members" panel button (see
// app/dashboard/projects/[id]/page.jsx, the
// <ProjectPanelDialog panelId="members"> block). That dialog already
// renders the title, description, and frame, so this component only
// renders the add-teammate control and the member list.
//
// DATA: nothing is fetched in this file any more. hooks/useProjectMembers.js
// owns the cache. <ProjectMembersPrefetch> on the project page fills it before
// the button is clicked, so this panel normally renders real data on its very
// first paint. If cached data is older than 30s it refreshes quietly in the
// background; the list is never replaced by a loading indicator.
//
// PERMISSIONS: this component never decides who is allowed to do what.
// GET /api/projects/[id]/members returns `canManage`, computed on the
// server with can(role, 'manageStaffing') from lib/project-permissions.js,
// and this panel just follows it.
//   canManage = true  (workspace OWNER / ADMIN, or PROJECT_MANAGER)
//     -> Add button, assign form, a role dropdown on every row, remove buttons
//   canManage = false (CONTRIBUTOR)
//     -> read-only list of names and roles; own row is marked "(you)"
//   A VIEWER gets a 403 from the API (can() allows them nothing yet), so
//   they see the "no access" message instead of the list.
// Hiding buttons is only a convenience. The API enforces the same rules,
// so a direct POST or DELETE from a Contributor still gets a 403. A cached
// `canManage` is never used to authorize anything.
//
// Usage: <ProjectMembersPanel projectId={project.id} /> inside
// <ProjectPanelDialog panelId="members">.

'use client'

import { useMemo, useState } from 'react'
import { Plus, Loader2, Trash2, Users } from 'lucide-react'
import {
  useProjectMembers,
  useWorkspaceMembers,
  useProjectMemberMutations,
} from '@/hooks/useProjectMembers'

const ROLE_LABELS = {
  PROJECT_MANAGER: 'Project Manager',
  CONTRIBUTOR: 'Contributor',
  VIEWER: 'Viewer',
}

// Shows WHY the server said no. For 400 / 403 / 404 the API sends a clear
// message (for example "This is the only Project Manager on this project..."),
// so we show that text instead of guessing. The roster is refetched by the
// mutation hooks after every attempt, so a demoted user's buttons disappear.
function reportMutationError(error, fallbackMessage) {
  const status = error.response?.status
  const serverMessage = [400, 403, 404].includes(status) ? error.response?.data?.error : null
  alert(serverMessage || fallbackMessage)
}

export default function ProjectMembersPanel({ projectId }) {
  // ── Data (from the shared cache) ───────────────────────────────────
  const {
    members,
    canManage,
    currentUserId,
    isLoading,
    accessDenied,
    loadFailed,
    refreshFailed,
    reload,
  } = useProjectMembers(projectId)

  // Only requested for someone who can assign people. A Contributor never
  // triggers this request.
  const { data: workspaceMembers, isError: workspaceMembersFailed } =
    useWorkspaceMembers(canManage)

  const { addMember, changeRole, removeMember } = useProjectMemberMutations(projectId)

  // ── Small UI state ─────────────────────────────────────────────────
  const [isAdding, setIsAdding] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState('CONTRIBUTOR')

  // Which row is busy right now (taken from the mutations themselves).
  const isSubmitting = addMember.isPending
  const roleChangingUserId = changeRole.isPending ? changeRole.variables?.userId : null
  const pendingUserId = removeMember.isPending ? removeMember.variables : null

  // Workspace people who are not yet on this project. A Set makes each
  // "is this person already here?" check instant; useMemo skips the work when
  // neither list changed.
  const availableToAdd = useMemo(() => {
    const onProject = new Set((members ?? []).map((m) => m.userId))
    return (workspaceMembers ?? []).filter((wm) => !onProject.has(wm.userId))
  }, [members, workspaceMembers])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!canManage || !selectedUserId) return // UI guard only; the API is the real lock
    try {
      await addMember.mutateAsync({ userId: selectedUserId, role: selectedRole })
      setIsAdding(false)
      setSelectedUserId('')
      setSelectedRole('CONTRIBUTOR')
    } catch (error) {
      reportMutationError(error, 'Could not add this person to the project.')
    }
  }

  // Changes an existing member's role. POST is an upsert on the server, so
  // posting the same userId with a new role just updates the row. The server
  // also refuses to demote the only Project Manager (400/403 with a clear
  // message). On failure the roster is refetched, so the dropdown snaps back
  // to what the server actually has.
  const handleRoleChange = async (userId, newRole) => {
    if (!canManage) return // UI guard only; the API is the real lock
    const current = members?.find((m) => m.userId === userId)
    if (!current || current.role === newRole) return
    try {
      await changeRole.mutateAsync({ userId, role: newRole })
    } catch (error) {
      reportMutationError(error, "Could not change this person's role.")
    }
  }

  const handleRemove = async (userId) => {
    if (!canManage) return // UI guard only; the API is the real lock
    try {
      await removeMember.mutateAsync(userId)
    } catch (error) {
      reportMutationError(error, 'Could not remove this person from the project.')
    }
  }

  // The server said no (403/404): show why, nothing else. Cached data is
  // deliberately NOT shown here.
  if (accessDenied) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <Users className="w-4 h-4 text-fp-text-tertiary" />
        <p className="text-xs text-fp-text-tertiary">
          You don&apos;t have access to this project&apos;s members.
        </p>
      </div>
    )
  }

  // Nothing cached AND the request failed (network down, server error).
  if (loadFailed) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <Users className="w-4 h-4 text-fp-text-tertiary" />
        <p className="text-xs text-fp-text-tertiary">Could not load project members.</p>
        <button
          type="button"
          onClick={() => reload()}
          className="text-[10px] font-bold uppercase tracking-wider text-fp-accent hover:text-fp-accent-hover transition-colors duration-150 cursor-pointer"
        >
          Try again
        </button>
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

      {/* A refresh failed but we still have a saved list: keep it, say so quietly. */}
      {refreshFailed && (
        <p className="py-1.5 text-[10px] text-fp-text-tertiary">
          Showing the last saved list. Couldn&apos;t refresh just now.
        </p>
      )}

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
          {workspaceMembersFailed && (
            <p className="w-full text-[10px] text-fp-text-tertiary">
              Could not load workspace members.
            </p>
          )}
        </form>
      )}

      {/* Only when there is NO cached data at all (first ever open, prefetch not done). */}
      {isLoading && (
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
                {/* Read-only label for people who can't manage staffing. */}
                {!canManage && (
                  <p className="text-[10px] text-fp-text-tertiary">{ROLE_LABELS[m.role] ?? m.role}</p>
                )}
              </div>

              {canManage && (
                <div className="flex items-center gap-2 shrink-0">
                  {/* Role dropdown: only rendered when canManage is true. */}
                  {roleChangingUserId === m.userId && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-fp-text-tertiary" />
                  )}
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                    disabled={roleChangingUserId === m.userId || pendingUserId === m.userId}
                    aria-label={`Role for ${m.name || m.email}`}
                    className="
                      bg-fp-base border border-fp-border text-fp-text-secondary
                      text-[10px] rounded-lg px-2 py-1
                      focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/50
                      disabled:opacity-50 cursor-pointer
                    "
                  >
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>

                  {/* Remove button: only rendered when canManage is true. */}
                  <button
                    type="button"
                    onClick={() => handleRemove(m.userId)}
                    disabled={pendingUserId === m.userId || roleChangingUserId === m.userId}
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
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}