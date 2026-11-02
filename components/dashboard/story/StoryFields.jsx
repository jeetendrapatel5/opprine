'use client'

// components/dashboard/story/StoryFields.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Small, reusable building blocks for the Story editor form.
// None of them know anything about projects or the API — they only render
// what they are given and call the callbacks they receive.
//
//   Section         — a titled panel that groups related fields
//   Field           — label + control + hint/error + optional counter
//   Counter         — "42 / 600" style character or tag count
//   Toggle          — accessible on/off switch
//   NarrativeField  — textarea with a character limit and counter
//   TagInput        — type-and-press-Enter tag list (tech stack)
//   buttonStyles    — class strings for the pill buttons
//   controlSurface  — shared look for inputs, selects and input groups
// ─────────────────────────────────────────────────────────────────────────────

import { useId, useRef, useState } from 'react'
import { X } from 'lucide-react'

// ── Shared class strings ──────────────────────────────────────────────────────

// One look for every form control. `focus-within` also matches the element
// itself when it is focused, so this works on a plain <input> and on a wrapper
// <div> that holds an input (like the URL field with its prefix).
export const controlSurface =
  'rounded-lg border border-fp-text-tertiary/30 bg-fp-base transition-colors duration-150 ' +
  'focus-within:border-fp-accent/60 focus-within:ring-2 focus-within:ring-fp-accent/30'

export const inputClass =
  `${controlSurface} w-full px-3 py-2.5 text-sm text-fp-text-primary outline-none ` +
  'placeholder:text-fp-text-tertiary'

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-accent/50 ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-fp-surface'

export const buttonStyles = {
  // The one main action on the page (Save changes).
  primary:
    'inline-flex h-9 items-center justify-center gap-2 rounded-full bg-fp-accent px-5 ' +
    'text-sm font-semibold text-fp-base transition-colors duration-150 ' +
    'hover:bg-fp-accent-hover disabled:pointer-events-none disabled:opacity-40 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-accent/50 ' +
    'focus-visible:ring-offset-2 focus-visible:ring-offset-fp-base',
  // Supporting actions (Copy link, Open, Replace, Remove).
  secondary:
    'inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-full border ' +
    'border-fp-text-tertiary/30 px-3.5 text-xs font-medium text-fp-text-primary ' +
    'transition-colors duration-150 hover:border-fp-accent/60 hover:text-fp-accent ' +
    `disabled:pointer-events-none disabled:opacity-40 ${focusRing}`,
}

// ── Section ───────────────────────────────────────────────────────────────────
// A panel with a title and a one-line description. `aside` is an optional
// element shown on the right of the title (we use it for the Live/Draft badge).
export function Section({ title, description, aside, children }) {
  return (
    <section className="rounded-xl border border-fp-border bg-fp-surface">
      <header className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-fp-text-primary">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-fp-text-secondary">
              {description}
            </p>
          )}
        </div>
        {aside}
      </header>
      <div className="space-y-5 px-5 pb-5 pt-5 sm:px-6 sm:pb-6">{children}</div>
    </section>
  )
}

// ── Field ─────────────────────────────────────────────────────────────────────
// `id` must match the id of the control inside, so clicking the label focuses it
// and screen readers announce the label.
// The line under the control shows the error if there is one, otherwise the
// hint. `meta` sits at the right end of that line (used for counters).
export function Field({ id, label, optional, hint, error, meta, children }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-medium text-fp-text-primary"
      >
        {label}
        {optional && (
          <span className="text-xs font-normal text-fp-text-secondary">Optional</span>
        )}
      </label>

      {children}

      {(error || hint || meta) && (
        <div className="mt-1.5 flex items-start justify-between gap-3 text-xs leading-relaxed">
          {error ? (
            <p role="alert" className="text-fp-danger">{error}</p>
          ) : (
            <p className="text-fp-text-secondary">{hint}</p>
          )}
          {meta}
        </div>
      )}
    </div>
  )
}

// ── Counter ───────────────────────────────────────────────────────────────────
// Turns amber once `current` reaches `warnAt` (defaults to the max).
export function Counter({ current, max, warnAt = max }) {
  return (
    <span
      className={`ml-auto shrink-0 tabular-nums ${
        current >= warnAt ? 'text-fp-warning' : 'text-fp-text-secondary'
      }`}
    >
      {current} / {max}
    </span>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────
// A real <button role="switch">, so keyboards and screen readers treat it as
// an on/off control. The label text is linked with aria-labelledby.
export function Toggle({ enabled, onChange, label, helper }) {
  const labelId = useId()

  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <p id={labelId} className="text-sm font-medium leading-snug text-fp-text-primary">
          {label}
        </p>
        {helper && (
          <p className="mt-0.5 text-xs leading-relaxed text-fp-text-secondary">{helper}</p>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-labelledby={labelId}
        onClick={() => onChange(!enabled)}
        className={`relative mt-0.5 h-6 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${focusRing} ${
          enabled ? 'bg-fp-accent' : 'bg-fp-text-tertiary/50'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            enabled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

// ── NarrativeField ────────────────────────────────────────────────────────────
// A textarea that cuts text off at `max` characters and shows a counter.
export function NarrativeField({ id, label, value, onChange, placeholder, max }) {
  return (
    <Field
      id={id}
      label={label}
      meta={<Counter current={value.length} max={max} warnAt={max - 80} />}
    >
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
        rows={5}
        placeholder={placeholder}
        className={`${inputClass} resize-none leading-relaxed`}
      />
    </Field>
  )
}

// ── TagInput ──────────────────────────────────────────────────────────────────
// How it works:
//   • What the person is typing lives in `draft` (local state).
//   • Enter, comma or leaving the field turns the draft into tags.
//   • A pasted "Next.js, Prisma" becomes two tags.
//   • Duplicates (ignoring upper/lower case) and anything past `max` are skipped.
//   • Backspace on an empty draft removes the last tag.
// The tag list itself is owned by the parent (`tags` + `onChange`).
export function TagInput({ id, tags, onChange, max, placeholder }) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)

  const commit = (raw) => {
    const incoming = raw.split(',').map((part) => part.trim()).filter(Boolean)
    if (incoming.length === 0) return

    const next = [...tags]
    for (const value of incoming) {
      if (next.length >= max) break
      if (next.some((tag) => tag.toLowerCase() === value.toLowerCase())) continue
      next.push(value)
    }
    if (next.length !== tags.length) onChange(next)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit(draft)
      setDraft('')
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  const handleBlur = () => {
    if (draft.trim()) {
      commit(draft)
      setDraft('')
    }
  }

  return (
    // Clicking empty space inside the box focuses the text input.
    <div
      className={`${controlSurface} flex min-h-[42px] cursor-text flex-wrap items-center gap-1.5 px-2.5 py-2`}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-md border border-fp-border bg-fp-raised py-1 pl-2 pr-1 text-xs font-medium text-fp-text-primary"
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            onClick={(e) => {
              e.stopPropagation()
              onChange(tags.filter((t) => t !== tag))
            }}
            className="cursor-pointer rounded p-0.5 text-fp-text-secondary transition-colors duration-150 hover:text-fp-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-accent/50"
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </span>
      ))}

      {tags.length < max && (
        <input
          id={id}
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={tags.length === 0 ? placeholder : 'Add another'}
          className="min-w-[100px] flex-1 bg-transparent text-sm text-fp-text-primary outline-none placeholder:text-fp-text-tertiary"
        />
      )}
    </div>
  )
}