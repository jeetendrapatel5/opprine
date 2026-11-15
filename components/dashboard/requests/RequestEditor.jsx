// components/dashboard/requests/RequestEditor.jsx
// Inline editor for a request that is still waiting on the client.
// Only fields that actually changed are sent: an overdue request keeps its
// old due date, which the server would reject if it were sent back unchanged.

'use client'

import { useId, useState } from 'react'
import { ActionButton, fieldClass, labelClass } from './request-ui'
import { LIMITS, toDateInput, todayInputValue } from './request-format'

// Same cleanup the server applies to titles (one line, trimmed).
const cleanTitle = (value) => value.replace(/\s+/g, ' ').trim()

export default function RequestEditor({ request, busy, onSave, onCancel }) {
  const baseId = useId()
  const [title, setTitle] = useState(request.title)
  const [instructions, setInstructions] = useState(request.instructions ?? '')
  const [dueDate, setDueDate] = useState(toDateInput(request.dueDate))
  const [titleMissing, setTitleMissing] = useState(false)

  const patch = {}
  if (cleanTitle(title) !== request.title) patch.title = title
  if (instructions.trim() !== (request.instructions ?? '')) patch.instructions = instructions.trim() || null
  if (dueDate !== toDateInput(request.dueDate)) patch.dueDate = dueDate || null
  const hasChanges = Object.keys(patch).length > 0

  function submit(e) {
    e.preventDefault()
    if (busy) return
    if (!cleanTitle(title)) {
      setTitleMissing(true)
      return
    }
    if (hasChanges) onSave({ action: 'update', ...patch })
  }

  const showTitleError = titleMissing && !cleanTitle(title)

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <div>
        <label htmlFor={`${baseId}-title`} className={labelClass}>
          Title
        </label>
        <input
          id={`${baseId}-title`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={LIMITS.TITLE_MAX}
          disabled={busy}
          autoFocus
          aria-invalid={showTitleError}
          aria-describedby={showTitleError ? `${baseId}-title-error` : undefined}
          className={fieldClass}
        />
        {showTitleError && (
          <p id={`${baseId}-title-error`} className="mt-1.5 text-xs text-fp-danger">
            Title is required.
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${baseId}-instructions`} className={labelClass}>
          Instructions (optional)
        </label>
        <textarea
          id={`${baseId}-instructions`}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          maxLength={LIMITS.INSTRUCTIONS_MAX}
          rows={3}
          disabled={busy}
          className={`${fieldClass} resize-none`}
        />
      </div>

      <div className="sm:max-w-[14rem]">
        <label htmlFor={`${baseId}-due`} className={labelClass}>
          Due date (optional)
        </label>
        <input
          id={`${baseId}-due`}
          type="date"
          min={todayInputValue()}
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          disabled={busy}
          className={fieldClass}
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <ActionButton type="submit" variant="primary" loading={busy} disabled={!hasChanges}>
          Save changes
        </ActionButton>
        <ActionButton variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </ActionButton>
      </div>
    </form>
  )
}
