// components/dashboard/requests/RequestComposer.jsx
// The "ask your client for something" form. Several requests can be sent at
// once: the client gets ONE email for the whole batch.
//
// Rules the server also enforces (it is the real lock):
//   - every request needs a title; titles are one line, up to 200 characters
//   - at most 20 requests per send, 2000 characters of instructions each
//   - a due date cannot be in the past
// Completely empty rows are ignored, so a spare row never blocks sending.

'use client'

import { useId, useRef, useState } from 'react'
import { Plus, Send, Trash2 } from 'lucide-react'
import { useCreateClientRequests } from '@/hooks/useClientRequests'
import DueDatePicker from './DueDatePicker'
import MilestoneSelect from './MilestoneSelect'
import { ActionButton, fieldClass, labelClass } from './request-ui'
import { LIMITS, friendlyError } from './request-format'

const TYPE_OPTIONS = [
  { value: 'TEXT', label: 'Written answer', hint: 'They write a reply.' },
  { value: 'APPROVAL', label: 'Approval', hint: 'They approve, or ask for changes.' },
  { value: 'FILE', label: 'File upload', hint: 'They upload a file.' },
]

let draftCounter = 0
const makeDraft = () => ({
  key: ++draftCounter,
  title: '',
  type: 'TEXT',
  instructions: '',
  dueDate: '',
  blocksWork: true,
})

const isBlank = (draft) => !draft.title.trim() && !draft.instructions.trim() && !draft.dueDate

function DraftFields({ draft, index, baseId, disabled, canRemove, titleMissing, onChange, onRemove }) {
  const id = `${baseId}-${index}`
  const selectedType = TYPE_OPTIONS.find((option) => option.value === draft.type)

  return (
    <li className="space-y-4 rounded-xl border border-fp-border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-fp-text-secondary">
          Request {index + 1}
        </p>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            aria-label={`Remove request ${index + 1}`}
            className="-mr-1.5 rounded-md p-1.5 text-fp-text-secondary transition-colors hover:bg-fp-danger/10 hover:text-fp-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-accent/40 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div>
        <label htmlFor={`${id}-title`} className={labelClass}>
          What do you need?
        </label>
        <input
          id={`${id}-title`}
          value={draft.title}
          onChange={(e) => onChange({ title: e.target.value })}
          maxLength={LIMITS.TITLE_MAX}
          disabled={disabled}
          autoFocus={index === 0}
          placeholder="e.g. Your logo files"
          aria-invalid={titleMissing}
          aria-describedby={titleMissing ? `${id}-title-error` : undefined}
          className={fieldClass}
        />
        {titleMissing && (
          <p id={`${id}-title-error`} className="mt-1.5 text-xs text-fp-danger">
            Add a title, or remove this request.
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${id}-instructions`} className={labelClass}>
          Details (optional)
        </label>
        <textarea
          id={`${id}-instructions`}
          value={draft.instructions}
          onChange={(e) => onChange({ instructions: e.target.value })}
          maxLength={LIMITS.INSTRUCTIONS_MAX}
          rows={2}
          disabled={disabled}
          placeholder="Anything that helps them answer"
          className={`${fieldClass} resize-none`}
        />
      </div>

      <fieldset disabled={disabled}>
        <legend className={labelClass}>How will they answer?</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {TYPE_OPTIONS.map((option) => (
            <label key={option.value} className="relative cursor-pointer">
              <input
                type="radio"
                name={`${id}-type`}
                value={option.value}
                checked={draft.type === option.value}
                onChange={() => onChange({ type: option.value })}
                className="peer sr-only"
              />
              <span className="block rounded-lg border border-fp-border bg-fp-raised px-3 py-2 text-center text-xs font-medium text-fp-text-secondary transition-colors hover:text-fp-text-primary peer-checked:border-fp-accent/60 peer-checked:bg-fp-accent-muted peer-checked:text-fp-text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-fp-accent/40 peer-disabled:opacity-50">
                {option.label}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-fp-text-secondary">{selectedType?.hint}</p>
      </fieldset>

      <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
        <DueDatePicker
          id={`${id}-due`}
          label="Due date (optional)"
          value={draft.dueDate}
          onChange={(dueDate) => onChange({ dueDate })}
          disabled={disabled}
        />
        <label className="flex cursor-pointer items-start gap-2 pb-2 text-xs text-fp-text-secondary">
          <input
            type="checkbox"
            checked={draft.blocksWork}
            onChange={(e) => onChange({ blocksWork: e.target.checked })}
            disabled={disabled}
            className="mt-0.5 accent-[var(--color-fp-accent)]"
          />
          <span>
            <span className="block font-medium text-fp-text-primary">Blocks my work</span>
            Counts toward blocked days while they have not answered.
          </span>
        </label>
      </div>
    </li>
  )
}

export default function RequestComposer({ projectId, milestones, onCreated, onCancel }) {
  const baseId = useId()
  const create = useCreateClientRequests(projectId)
  const sending = useRef(false) // blocks a second submit before React re-renders
  const [milestoneId, setMilestoneId] = useState('')
  const [drafts, setDrafts] = useState(() => [makeDraft()])
  const [notifyClient, setNotifyClient] = useState(true)
  const [missingKeys, setMissingKeys] = useState([])
  const [formError, setFormError] = useState('')

  const submitting = create.isPending
  const items = drafts.filter((draft) => !isBlank(draft))
  const error = formError || (create.isError ? friendlyError(create.error) : '')

  const change = (key, patch) =>
    setDrafts((list) => list.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)))
  const remove = (key) =>
    setDrafts((list) => (list.length > 1 ? list.filter((draft) => draft.key !== key) : list))

  function submit(e) {
    e.preventDefault()
    if (sending.current || submitting) return

    const untitled = items.filter((draft) => !draft.title.trim()).map((draft) => draft.key)
    setMissingKeys(untitled)
    if (items.length === 0) {
      setFormError('Add a title to at least one request.')
      return
    }
    if (untitled.length > 0) {
      setFormError('')
      return
    }

    setFormError('')
    sending.current = true
    create.mutate(
      {
        milestoneId: milestoneId || null,
        notifyClient,
        requests: items.map((draft) => ({
          title: draft.title,
          type: draft.type,
          instructions: draft.instructions || null,
          blocksWork: draft.blocksWork,
          dueDate: draft.dueDate || null,
        })),
      },
      {
        onSuccess: (data) =>
          onCreated({ count: items.length, notified: notifyClient, emailSent: Boolean(data?.emailSent) }),
        onError: () => {
          sending.current = false
        },
      }
    )
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="space-y-4">
        {milestones.length > 0 && (
          <MilestoneSelect
            id={`${baseId}-milestone`}
            label="For milestone (optional)"
            value={milestoneId}
            onChange={setMilestoneId}
            milestones={milestones}
            disabled={submitting}
          />
        )}

        <ol className="space-y-3">
          {drafts.map((draft, index) => (
            <DraftFields
              key={draft.key}
              draft={draft}
              index={index}
              baseId={baseId}
              disabled={submitting}
              canRemove={drafts.length > 1}
              titleMissing={missingKeys.includes(draft.key) && !draft.title.trim()}
              onChange={(patch) => change(draft.key, patch)}
              onRemove={() => remove(draft.key)}
            />
          ))}
        </ol>

        {drafts.length < LIMITS.BATCH_MAX && (
          <ActionButton
            icon={Plus}
            onClick={() => setDrafts((list) => [...list, makeDraft()])}
            disabled={submitting}
          >
            Add another request
          </ActionButton>
        )}
      </div>

      <div className="sticky bottom-0 -mx-1 mt-5 border-t border-fp-border bg-fp-surface px-1 pb-1 pt-4">
        {error && (
          <p role="alert" className="mb-3 text-xs text-fp-danger">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-fp-text-secondary">
            <input
              type="checkbox"
              checked={notifyClient}
              onChange={(e) => setNotifyClient(e.target.checked)}
              disabled={submitting}
              className="accent-[var(--color-fp-accent)]"
            />
            Email my client about these
          </label>
          <div className="flex items-center gap-2">
            <ActionButton variant="ghost" onClick={onCancel} disabled={submitting}>
              Cancel
            </ActionButton>
            <ActionButton type="submit" variant="primary" icon={Send} loading={submitting}>
              {items.length > 1 ? `Send ${items.length} requests` : 'Send request'}
            </ActionButton>
          </div>
        </div>
      </div>
    </form>
  )
}