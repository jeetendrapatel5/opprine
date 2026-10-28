'use client'

// components/LeadForm.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The "Send inquiry" form on the public showcase page.
//
// It is its own file so the showcase page itself stays a Server Component —
// only this small form ships JavaScript to the browser.
//
// Flow: type → submit → POST /api/inquiries { name, email, message, projectId }
//       → success panel replaces the form. A failure shows an inline message
//       (no browser alert) and keeps everything the person typed.
//
// It sits on the dark contact panel, so it uses the dark fp-* tokens.
// ─────────────────────────────────────────────────────────────────────────────

import { useId, useState } from 'react'
import axios from 'axios'
import { CheckCircle2, Loader2 } from 'lucide-react'

const inputClass =
  'w-full rounded-xl border border-fp-text-tertiary/30 bg-fp-base px-4 py-3 text-[15px] ' +
  'text-fp-text-primary outline-none transition-colors duration-150 placeholder:text-fp-text-tertiary ' +
  'focus:border-fp-accent/60 focus:ring-2 focus:ring-fp-accent/30'

// Label + control. `id` must match the control's id so clicking the label
// focuses the input and screen readers announce it.
function FormField({ id, label, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-fp-text-primary">
        {label}
      </label>
      {children}
    </div>
  )
}

export default function LeadForm({ projectId, freelancerName }) {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState('')

  // One prefix, three unique ids (safe even if the form appears twice).
  const uid = useId()

  const handleChange = (field) => (e) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    setError('')

    try {
      await axios.post('/api/inquiries', { ...formData, projectId })
      setIsSent(true)
    } catch (err) {
      setError(
        err.response?.data?.error ?? 'Your message could not be sent. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSent) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-fp-border bg-fp-surface p-8 text-center sm:p-10"
      >
        <CheckCircle2 className="mx-auto mb-4 size-10 text-fp-success" aria-hidden="true" />
        <h3 className="font-display text-2xl font-medium text-fp-text-primary">Inquiry sent</h3>
        <p className="mt-2 text-fp-text-secondary">
          We&apos;ve notified {freelancerName}. They will be in touch shortly.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-fp-border bg-fp-surface p-6 text-left sm:p-8"
    >
      <FormField id={`${uid}-name`} label="Your name">
        <input
          id={`${uid}-name`}
          type="text"
          required
          autoComplete="name"
          value={formData.name}
          onChange={handleChange('name')}
          className={inputClass}
        />
      </FormField>

      <FormField id={`${uid}-email`} label="Email address">
        <input
          id={`${uid}-email`}
          type="email"
          required
          autoComplete="email"
          value={formData.email}
          onChange={handleChange('email')}
          className={inputClass}
        />
      </FormField>

      <FormField id={`${uid}-message`} label="Project details">
        <textarea
          id={`${uid}-message`}
          rows={4}
          required
          value={formData.message}
          onChange={handleChange('message')}
          placeholder="What do you need built?"
          className={`${inputClass} resize-none leading-relaxed`}
        />
      </FormField>

      {error && (
        <p role="alert" className="text-sm text-fp-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-fp-text-primary px-6 text-[15px] font-medium text-fp-base transition-colors duration-150 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-fp-surface disabled:pointer-events-none disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Sending…
          </>
        ) : (
          `Send inquiry to ${freelancerName}`
        )}
      </button>
    </form>
  )
}