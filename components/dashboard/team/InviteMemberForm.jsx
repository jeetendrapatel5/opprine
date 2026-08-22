// components/dashboard/team/InviteMemberForm.jsx
//
// Client Component — needs to be, since it holds form state and makes
// a fetch() call. Posts to POST /api/workspace/invites (built earlier)
// and lets that route do all real validation (this component's own
// checks are just for a responsive UI, not the source of truth).
//
// FLAGGED: input/select styling below is hand-rolled with fp- tokens,
// since no existing form input was in the file I was given to match
// against. If shadcn's <Input>/<Select> are already used elsewhere in
// this app, swap them in here instead — see the chat message before
// this code.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

// Matches INVITABLE_ROLES in app/api/workspace/invites/route.js exactly
// — OWNER is intentionally not offered here, mirroring the backend.
const ROLE_OPTIONS = [
  { value: 'MEMBER', label: 'Member' },
  { value: 'ADMIN', label: 'Admin' },
]

export default function InviteMemberForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('MEMBER')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setSuccess(false)
    setSubmitting(true)

    try {
      const res = await fetch('/api/workspace/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })

      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(body.error ?? 'Could not send this invite.')
      }

      setEmail('')
      setRole('MEMBER')
      setSuccess(true)
      // Re-runs the Server Component that fetched the pending-invites
      // list, so the new invite shows up below without a full reload.
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send this invite.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label
          htmlFor="invite-email"
          className="block text-[10px] font-bold text-fp-text-tertiary uppercase tracking-widest mb-1.5"
        >
          Email
        </label>
        <input
          id="invite-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@company.com"
          className="
            w-full h-9 px-3 rounded-lg text-sm
            bg-fp-base border border-fp-border
            text-fp-text-primary placeholder:text-fp-text-tertiary
            focus:outline-none focus:border-fp-accent/50 focus:ring-1 focus:ring-fp-accent/30
            transition-colors duration-150
          "
        />
      </div>

      <div>
        <label
          htmlFor="invite-role"
          className="block text-[10px] font-bold text-fp-text-tertiary uppercase tracking-widest mb-1.5"
        >
          Role
        </label>
        <select
          id="invite-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="
            w-full h-9 px-3 rounded-lg text-sm
            bg-fp-base border border-fp-border
            text-fp-text-primary
            focus:outline-none focus:border-fp-accent/50 focus:ring-1 focus:ring-fp-accent/30
            transition-colors duration-150
          "
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-xs text-fp-danger">{error}</p>}
      {success && <p className="text-xs text-fp-success">Invite sent.</p>}

      {/* Exact primary-button classes from the "Open portal" link in
          page.jsx: bg-fp-accent text-black text-xs font-semibold,
          hover:opacity-90 — not a new style invented for this form. */}
      <button
        type="submit"
        disabled={submitting}
        className="
          w-full inline-flex items-center justify-center gap-1.5
          h-8 px-3 rounded-lg
          bg-fp-accent text-black text-xs font-semibold
          hover:opacity-90 transition-opacity
          disabled:opacity-60 disabled:pointer-events-none
        "
      >
        {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {submitting ? 'Sending…' : 'Send invite'}
      </button>
    </form>
  )
}