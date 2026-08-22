// components/invite/AcceptInviteButton.jsx
//
// Client Component — needs interactivity (a click handler, a loading
// state), so this piece can't be part of the Server Component page.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AcceptInviteButton({ token }) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleAccept() {
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch(`/api/invites/${token}/accept`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(body.error ?? 'Could not accept this invite.')
      }

      // acceptInvite (lib/invites.js) already set activeWorkspaceId to
      // the workspace they just joined — landing on /dashboard here
      // will show that workspace without any extra step.
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept this invite.')
      setSubmitting(false)
    }
  }

  return (
    <div>
      {error && <p className="text-xs text-fp-danger mb-3">{error}</p>}
      <button
        type="button"
        onClick={handleAccept}
        disabled={submitting}
        className="
          w-full inline-flex items-center justify-center gap-1.5
          h-9 px-4 rounded-lg
          bg-fp-accent text-black text-sm font-semibold
          hover:opacity-90 transition-opacity
          disabled:opacity-60 disabled:pointer-events-none
        "
      >
        {submitting ? 'Joining…' : 'Accept invite'}
      </button>
    </div>
  )
}