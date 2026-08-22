// components/dashboard/team/ReceivedInvitesList.jsx
//
// Client Component — the accept button needs a fetch call and a
// loading state, so this can't stay server-rendered even though the
// data itself was fetched server-side (see app/dashboard/team/page.jsx).
//
// Reuses POST /api/invites/[token]/accept — the SAME endpoint the
// standalone /invite/[token] page already calls. No new accept
// endpoint needed; this is just a second entry point to the same
// action.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Check, Mail } from 'lucide-react'

const ROLE_TEXT_CLASSES = {
  OWNER: 'text-fp-accent',
  ADMIN: 'text-fp-warning',
  MEMBER: 'text-fp-text-tertiary',
}

function timeLeftLabel(expiresAt) {
  const diffMs = new Date(expiresAt).getTime() - Date.now()
  if (diffMs <= 0) return null
  const hours = Math.floor(diffMs / 3_600_000)
  if (hours >= 1) return `${hours}h left`
  const minutes = Math.max(1, Math.floor(diffMs / 60_000))
  return `${minutes}m left`
}

export default function ReceivedInvitesList({ initialInvites }) {
  const router = useRouter()
  const [invites, setInvites] = useState(initialInvites)
  const [acceptingToken, setAcceptingToken] = useState(null)
  const [error, setError] = useState(null)

  async function handleAccept(invite) {
    setError(null)
    setAcceptingToken(invite.token)

    try {
      const res = await fetch(`/api/invites/${invite.token}/accept`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(body.error ?? 'Could not accept this invite.')
      }

      // IMPORTANT, worth understanding before changing this: accepting
      // sets activeWorkspaceId to the workspace just joined (see
      // acceptInvite in lib/invites.js). router.refresh() re-runs this
      // page's Server Component, which will now resolve the ACTIVE
      // workspace as the one just joined — so Members and "Pending
      // invites you sent" below will switch to show that new
      // workspace's data, not the one you started this page on. That's
      // intentional, matching how accepting via the emailed link
      // already behaves — not something special-cased for this list.
      setInvites((current) => current.filter((i) => i.token !== invite.token))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept this invite.')
    } finally {
      setAcceptingToken(null)
    }
  }

  // Hidden entirely when empty — most visits to this page won't have
  // any received invites, and an empty "nothing here" banner would just
  // be permanent clutter above the actual team-management content.
  if (invites.length === 0) return null

  return (
    <div className="mb-8 bg-fp-accent-muted border border-fp-accent/20 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-fp-accent/20 flex items-center gap-2">
        <Mail className="w-3.5 h-3.5 text-fp-accent" />
        <p className="text-[10px] font-bold text-fp-accent uppercase tracking-widest">
          Invites for you · {invites.length}
        </p>
      </div>

      {error && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-fp-danger/10 border border-fp-danger/20">
          <p className="text-xs text-fp-danger">{error}</p>
        </div>
      )}

      <div className="divide-y divide-fp-accent/10">
        {invites.map((invite) => {
          const timeLeft = timeLeftLabel(invite.expiresAt)
          const accepting = acceptingToken === invite.token

          return (
            <div key={invite.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-fp-text-primary truncate">
                  {invite.workspaceName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-fp-text-secondary truncate">
                    {invite.inviterName ?? 'Someone'} invited you as
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest ${
                      ROLE_TEXT_CLASSES[invite.role] ?? ROLE_TEXT_CLASSES.MEMBER
                    }`}
                  >
                    {invite.role}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-2.5 h-2.5 text-fp-text-tertiary" />
                  <span className="text-[10px] text-fp-text-tertiary">
                    {invite.isExpired ? 'Expired' : timeLeft}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAccept(invite)}
                disabled={accepting || invite.isExpired}
                className="
                  shrink-0 inline-flex items-center gap-1.5
                  h-8 px-3 rounded-lg
                  bg-fp-accent text-black text-xs font-semibold
                  hover:opacity-90 transition-opacity
                  disabled:opacity-50 disabled:pointer-events-none
                "
              >
                {accepting ? (
                  'Joining…'
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Accept
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}