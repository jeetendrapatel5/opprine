// components/dashboard/WorkspaceSwitcherDropdown.jsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronsUpDown, Check, Plus } from 'lucide-react'

const ROLE_TEXT_CLASSES = {
  OWNER: 'text-fp-accent',
  ADMIN: 'text-fp-warning',
  MEMBER: 'text-fp-text-tertiary',
}

export default function WorkspaceSwitcherDropdown({ workspaces, onWorkspaceChanged }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [switchingId, setSwitchingId] = useState(null)
  const [error, setError] = useState(null)

  const [creatingWorkspace, setCreatingWorkspace] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

  const containerRef = useRef(null)

  const active = workspaces.find((w) => w.isActive) ?? workspaces[0]

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
        setCreatingWorkspace(false)
        setNewWorkspaceName('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSwitch(workspaceId) {
    if (workspaceId === active?.workspaceId) {
      setOpen(false)
      return
    }

    setError(null)
    setSwitchingId(workspaceId)

    try {
      const res = await fetch('/api/workspace/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      })
      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(body.error ?? 'Could not switch workspaces.')
      }

      setOpen(false)

      // Same reasoning as workspace creation: this dropdown's own
      // `workspaces` list is client-side state fetched once by the
      // parent. router.refresh() re-renders SERVER components, it does
      // NOT re-run that fetch — so without this call, the dropdown
      // itself could keep showing the old workspace as "active" even
      // though the switch already succeeded.
      await onWorkspaceChanged?.()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not switch workspaces.')
    } finally {
      setSwitchingId(null)
    }
  }

  async function handleCreateWorkspace() {
    const name = newWorkspaceName.trim()
    if (!name) {
      setCreateError('Give it a name first.')
      return
    }

    setCreateError(null)
    setIsCreating(true)

    try {
      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(body.error ?? 'Could not create workspace.')
      }

      setCreatingWorkspace(false)
      setNewWorkspaceName('')
      setOpen(false)

      await onWorkspaceChanged?.()
      router.refresh()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not create workspace.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="
          w-full flex items-center justify-between gap-2
          h-9 px-3 rounded-lg
          bg-fp-surface border border-fp-border
          text-fp-text-primary text-sm font-medium
          hover:border-fp-border/80 transition-colors duration-150 cursor-pointer
        "
      >
        <span className="truncate">{active?.name}</span>
        <ChevronsUpDown className="w-3.5 h-3.5 text-fp-text-tertiary shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1.5 z-50 bg-fp-raised border border-fp-border rounded-lg shadow-lg overflow-hidden py-1">
          {workspaces.map((ws) => (
            <button
              key={ws.workspaceId}
              type="button"
              onClick={() => handleSwitch(ws.workspaceId)}
              disabled={switchingId === ws.workspaceId}
              className="
                w-full flex items-center justify-between gap-2
                px-3 py-2 text-left text-sm
                hover:bg-fp-accent-muted transition-colors duration-150
                disabled:opacity-50 cursor-pointer
              "
            >
              <span className="min-w-0">
                <span className="block text-fp-text-primary truncate">{ws.name}</span>
                <span
                  className={`block text-[10px] font-bold uppercase tracking-widest ${
                    ROLE_TEXT_CLASSES[ws.role] ?? ROLE_TEXT_CLASSES.MEMBER
                  }`}
                >
                  {ws.role}
                </span>
              </span>
              {ws.workspaceId === active?.workspaceId && (
                <Check className="w-3.5 h-3.5 text-fp-accent shrink-0" />
              )}
            </button>
          ))}

          <div className="border-t border-fp-border mt-1 pt-1">
            {creatingWorkspace ? (
              <div className="px-3 py-2 space-y-1.5">
                <input
                  autoFocus
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateWorkspace()
                    if (e.key === 'Escape') {
                      setCreatingWorkspace(false)
                      setNewWorkspaceName('')
                      setCreateError(null)
                    }
                  }}
                  placeholder="Workspace name"
                  disabled={isCreating}
                  className="
                    w-full h-8 px-2 rounded-md text-sm
                    bg-fp-surface border border-fp-border
                    text-fp-text-primary placeholder:text-fp-text-tertiary
                    focus:outline-none focus:border-fp-accent/50
                  "
                />
                {createError && <p className="text-xs text-fp-danger">{createError}</p>}
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleCreateWorkspace}
                    disabled={isCreating}
                    className="flex-1 h-7 rounded-md bg-fp-accent text-black text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {isCreating ? 'Creating…' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatingWorkspace(false)
                      setNewWorkspaceName('')
                      setCreateError(null)
                    }}
                    disabled={isCreating}
                    className="h-7 px-2 rounded-md text-xs text-fp-text-tertiary hover:text-fp-text-primary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreatingWorkspace(true)}
                className="w-full flex items-center cursor-pointer gap-2 px-3 py-2 text-left text-sm text-fp-text-tertiary hover:bg-fp-accent-muted transition-colors duration-150"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>New workspace</span>
              </button>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-1.5 text-xs text-fp-danger">{error}</p>}
    </div>
  )
}