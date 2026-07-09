'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

export default function DeleteProjectButton({ projectId, projectName }) {
  const [uiState, setUiState] = useState('idle')
  const [error, setError]     = useState('')

  const router = useRouter()
  const handleDelete = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    setUiState('loading')
    setError('')

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete project')
      }

      router.refresh()

    } catch (err) {
      setError(err.message)
      setUiState('confirm')
    }
  }

  const handleTrashClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setUiState('confirm')
  }

  const handleCancel = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setUiState('idle')
    setError('')
  }

  if (uiState === 'idle') {
    return (
      <button
        onClick={handleTrashClick}
        title={`Delete "${projectName}"`}
        aria-label={`Delete project ${projectName}`}
        className="
          opacity-100 sm:opacity-0 sm:group-hover:opacity-100
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

  if (uiState === 'loading') {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <Loader2 className="w-4 h-4 text-fp-text-tertiary animate-spin" />
        <span className="text-fp-text-tertiary text-xs">Deleting...</span>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col items-end gap-1 shrink-0"
      onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      <div className="flex items-center gap-2">
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

      {error && (
        <p className="text-fp-danger text-[11px] text-right max-w-[180px] leading-tight">
          {error}
        </p>
      )}
    </div>
  )
}
