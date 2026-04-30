// components/DeleteProjectButton.jsx
//
// WHY THIS IS A SEPARATE COMPONENT (not inside ProjectCard):
// ProjectCard is a Server Component — it runs on the server and has no
// interactivity. Delete requires useState (to show the confirmation UI)
// and useRouter (to refresh after deletion). These are client-side hooks.
//
// By isolating the delete logic here with 'use client', we keep ProjectCard
// as a Server Component and only make THIS small button client-side.
// This is the Next.js "islands" pattern — client interactivity in isolated
// components, not spread across the whole tree.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

// ─── How the component works ────────────────────────────────────────────────
//
// STATE MACHINE (3 states):
//   'idle'     → shows the trash icon (default, hidden until card hover)
//   'confirm'  → shows "Delete?" + Cancel + Delete buttons (after first click)
//   'loading'  → shows a spinner (while API call is in flight)
//
// DATA FLOW:
//   User clicks trash → state = 'confirm'
//   User clicks Cancel → state = 'idle'
//   User clicks Delete → calls DELETE /api/projects/[id]
//                      → on success: router.refresh() re-fetches dashboard data
//                      → on error: shows error message, state = 'confirm'
//
// PROPS:
//   projectId  — the Prisma project ID (e.g. 'cm9abc123')
//   projectName — used in the confirmation message for clarity

export default function DeleteProjectButton({ projectId, projectName }) {
  // Three possible states for this component
  const [uiState, setUiState] = useState('idle') // 'idle' | 'confirm' | 'loading'
  const [error, setError]     = useState('')

  // useRouter lets us call router.refresh() after deletion.
  // refresh() re-runs the Server Component data fetch (the prisma.findMany call
  // in dashboard/page.jsx) and updates the UI without a full page reload.
  const router = useRouter()

  // ── Called when the user clicks the red "Delete" confirmation button ──────
  const handleDelete = async (e) => {
    // CRITICAL: stop the click from bubbling up to the <Link> wrapper in ProjectCard.
    // Without this, clicking Delete would also navigate to the project page.
    e.preventDefault()
    e.stopPropagation()

    setUiState('loading')
    setError('')

    try {
      // fetch() is the native browser API for HTTP requests.
      // We call our DELETE route at /api/projects/[id].
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        // If the server returned a non-2xx status, parse the error message
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete project')
      }

      // Success — re-fetch the dashboard data.
      // router.refresh() tells Next.js to re-run the server components,
      // which re-runs the prisma.project.findMany() in page.jsx.
      // The deleted project will be gone from the new data.
      router.refresh()

      // No need to reset state — this component will unmount because
      // the project card it belongs to will be removed from the list

    } catch (err) {
      // Show the error, go back to confirm state so user can retry or cancel
      setError(err.message)
      setUiState('confirm')
    }
  }

  // ── Handle trash icon click (first click — show confirmation) ─────────────
  const handleTrashClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setUiState('confirm')
  }

  // ── Handle cancel ─────────────────────────────────────────────────────────
  const handleCancel = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setUiState('idle')
    setError('')
  }

  // ── RENDER: idle state ────────────────────────────────────────────────────
  // Default state — the trash icon button.
  // opacity-0 group-hover:opacity-100 → invisible until the card is hovered.
  // This keeps the card clean. The icon appears as a "reveal on hover".
  if (uiState === 'idle') {
    return (
      <button
        onClick={handleTrashClick}
        title={`Delete "${projectName}"`}
        aria-label={`Delete project ${projectName}`}
        className="
          opacity-0 group-hover:opacity-100
          p-1.5 rounded-lg
          text-fp-text-tertiary
          hover:text-fp-danger hover:bg-fp-danger/10
          transition-all duration-150
          cursor-pointer
          shrink-0
        "
      >
        <Trash2 className="w-4 h-4" />
      </button>
    )
  }

  // ── RENDER: loading state ─────────────────────────────────────────────────
  // Shown while the DELETE fetch is in flight.
  // Replaces the confirm buttons with a spinner so the user knows it's working.
  if (uiState === 'loading') {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <Loader2 className="w-4 h-4 text-fp-text-tertiary animate-spin" />
        <span className="text-fp-text-tertiary text-xs">Deleting…</span>
      </div>
    )
  }

  // ── RENDER: confirm state ─────────────────────────────────────────────────
  // Shown after the first click on the trash icon.
  // Replaces the "View →" arrow area with inline confirmation buttons.
  // This avoids a modal — the confirmation lives in the card itself.
  return (
    <div
      className="flex flex-col items-end gap-1 shrink-0"
      // Stop any click in this area from bubbling to the <Link>
      onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      <div className="flex items-center gap-2">
        {/* Cancel — secondary action, muted style */}
        <button
          onClick={handleCancel}
          className="
            text-fp-text-tertiary text-xs font-medium
            px-2.5 py-1 rounded-lg
            hover:bg-fp-surface hover:text-fp-text-secondary
            transition-colors duration-150 cursor-pointer
          "
        >
          Cancel
        </button>

        {/* Delete — destructive action, danger color */}
        {/* "Delete project?" as the label makes it explicit what will happen */}
        <button
          onClick={handleDelete}
          className="
            bg-fp-danger/10 hover:bg-fp-danger
            text-fp-danger hover:text-white
            text-xs font-semibold
            px-2.5 py-1 rounded-lg
            border border-fp-danger/30
            transition-colors duration-150 cursor-pointer
          "
        >
          Delete
        </button>
      </div>

      {/* Inline error — only shown if the API call fails */}
      {error && (
        <p className="text-fp-danger text-[11px] text-right max-w-[180px] leading-tight">
          {error}
        </p>
      )}
    </div>
  )
}