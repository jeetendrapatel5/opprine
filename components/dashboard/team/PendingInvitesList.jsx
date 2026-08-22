// components/dashboard/team/PendingInvitesList.jsx
//
// Client Component — the revoke button needs interactivity (loading
// state, a fetch call), so this can't stay server-rendered even though
// most of it is just a list.
//
// canManage is passed down from the Server Component page (which
// already knows the viewer's role) rather than recomputed here. This
// is a UI convenience only, not the real security boundary — DELETE
// /api/workspace/invites/[id] enforces OWNER/ADMIN itself regardless
// of whether this button is visible. Hiding it just avoids showing a
// button that would 403 if clicked.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, X } from 'lucide-react'

// Matches the STATUS_CONFIG convention in page.jsx exactly: badges are
// plain colored TEXT, no background tint — not a new pattern invented
// for this component.
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

// Groups invites by who sent them, so a workspace with several
// OWNER/ADMIN members sending invites doesn't turn into one long,
// undifferentiated list. invitedByName comes from lib/invites.js
// (listInvites now joins it); null means the inviter's account was
// later deleted (onDelete: SetNull in schema.prisma) — falls back to a
// clear label instead of a blank header.
//
// Group ORDER: invites arrive pre-sorted newest-first from listInvites.
// Building groups by first-occurrence order means the group containing
// the MOST RECENT invite overall ends up first — no separate sort step
// needed, it falls out of the input order for free.
function groupByInviter(invites) {
  const order = []
  const groups = new Map()

  for (const invite of invites) {
    const key = invite.invitedByUserId ?? 'unknown'
    if (!groups.has(key)) {
      groups.set(key, { key, name: invite.invitedByName ?? 'A former member', invites: [] })
      order.push(key)
    }
    groups.get(key).invites.push(invite)
  }

  return order.map((key) => groups.get(key))
}

export default function PendingInvitesList({ initialInvites, canManage }) {
  const router = useRouter()
  const [invites, setInvites] = useState(initialInvites)
  const [revokingId, setRevokingId] = useState(null)
  const [error, setError] = useState(null)

  async function handleRevoke(id) {
    setError(null)
    setRevokingId(id)

    try {
      const res = await fetch(`/api/workspace/invites/${id}`, { method: 'DELETE' })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Could not revoke this invite.')
      }

      setInvites((current) => current.filter((invite) => invite.id !== id))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke this invite.')
    } finally {
      setRevokingId(null)
    }
  }

  if (invites.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-xs text-fp-text-tertiary">No pending invites.</p>
      </div>
    )
  }

  const groups = groupByInviter(invites)

  return (
    <div>
      {error && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-fp-danger/10 border border-fp-danger/20">
          <p className="text-xs text-fp-danger">{error}</p>
        </div>
      )}

      {groups.map((group, index) => (
        <div key={group.key} className={index > 0 ? 'border-t border-fp-border' : undefined}>
          {/* Sender sub-header — same text treatment PanelCard already
              uses for its own label, so this reads as a natural nested
              continuation of the panel header rather than a competing
              new style. */}
          <div className="px-4 pt-3 pb-1.5">
            <p className="text-[10px] font-bold text-fp-text-tertiary uppercase tracking-widest">
              Invited by {group.name}
              <span className="font-medium normal-case tracking-normal text-fp-text-tertiary/70">
                {' '}
                · {group.invites.length}
              </span>
            </p>
          </div>

          <div className="divide-y divide-fp-border">
            {group.invites.map((invite) => (
              <InviteRow
                key={invite.id}
                invite={invite}
                canManage={canManage}
                revoking={revokingId === invite.id}
                onRevoke={handleRevoke}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// One invite row — extracted since it's now called from inside a .map
// that's itself inside a .map (groups → invites), and duplicating this
// markup at both levels would be exactly the kind of drift risk this
// codebase already tries to avoid elsewhere.
function InviteRow({ invite, canManage, revoking, onRevoke }) {
  const timeLeft = timeLeftLabel(invite.expiresAt)

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-fp-text-primary truncate">{invite.email}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={`text-[10px] font-bold uppercase tracking-widest ${
              ROLE_TEXT_CLASSES[invite.role] ?? ROLE_TEXT_CLASSES.MEMBER
            }`}
          >
            {invite.role}
          </span>
          <span className="text-fp-text-tertiary text-[10px]">·</span>
          {invite.isExpired ? (
            <span className="flex items-center gap-1 text-[10px] text-fp-danger">
              <Clock className="w-2.5 h-2.5" />
              Expired
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-fp-text-tertiary">
              <Clock className="w-2.5 h-2.5" />
              {timeLeft}
            </span>
          )}
        </div>
      </div>

      {canManage && (
        <button
          type="button"
          onClick={() => onRevoke(invite.id)}
          disabled={revoking}
          aria-label={`Revoke invite for ${invite.email}`}
          className="
            shrink-0 w-7 h-7 rounded-lg
            flex items-center justify-center
            text-fp-text-tertiary hover:text-fp-danger hover:bg-fp-danger/10
            transition-colors duration-150
            disabled:opacity-50 disabled:pointer-events-none
          "
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}