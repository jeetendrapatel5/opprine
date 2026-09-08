// components/dashboard/team/MembersList.jsx
//
// Client Component — needs interactivity (a click handler, a
// confirmation step, a loading state) for the remove action, so this
// replaces the old server-rendered MemberRow that used to live inline
// in app/dashboard/team/page.jsx.
//
// Per-row remove-button visibility is computed from ROLE_RANK, mirroring
// the exact permission rule enforced server-side in removeMember
// (lib/workspace.js): OWNER > ADMIN > MEMBER, strictly higher rank
// required, self-removal never allowed. This is a UI convenience only —
// hiding a button that would 403 anyway — the real enforcement is the
// backend check, not this component.

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

// Matches STATUS_CONFIG's convention exactly: plain colored text, no
// background tint on the badge itself.
const ROLE_TEXT_CLASSES = {
  OWNER: 'text-fp-accent',
  ADMIN: 'text-fp-warning',
  MEMBER: 'text-fp-text-tertiary',
}

const ROLE_RANK = { OWNER: 3, ADMIN: 2, MEMBER: 1 }

export default function MembersList({ initialMembers, currentUserId, currentUserRole }) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [removingId, setRemovingId] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    setMembers(initialMembers)
  }, [initialMembers])

  async function handleRemove(member) {
    const confirmed = window.confirm(
      `Remove ${member.name} from this workspace? They'll lose access immediately.`
    )
    if (!confirmed) return

    setError(null)
    setRemovingId(member.userId)

    try {
      const res = await fetch(`/api/workspace/members/${member.userId}`, { method: 'DELETE' })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Could not remove this member.')
      }

      setMembers((current) => current.filter((m) => m.userId !== member.userId))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove this member.')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-fp-danger/10 border border-fp-danger/20">
          <p className="text-xs text-fp-danger">{error}</p>
        </div>
      )}

      <div className="bg-fp-surface border border-fp-border rounded-xl overflow-hidden divide-y divide-fp-border">
        {members.map((member) => {
          const isYou = member.userId === currentUserId
          const removable = !isYou && ROLE_RANK[currentUserRole] > ROLE_RANK[member.role]
          const initial = member.name?.[0]?.toUpperCase() ?? '?'

          return (
            <div key={member.userId} className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-fp-accent/15 border border-fp-accent/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-fp-accent leading-none">{initial}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fp-text-primary truncate">
                    {member.name}
                    {isYou && <span className="text-fp-text-tertiary font-normal"> (you)</span>}
                  </p>
                  <p className="text-[11px] text-fp-text-tertiary truncate mt-0.5">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md ${ROLE_TEXT_CLASSES[member.role] ?? ROLE_TEXT_CLASSES.MEMBER
                    }`}
                >
                  {member.role}
                </span>

                {removable && (
                  <button
                    type="button"
                    onClick={() => handleRemove(member)}
                    disabled={removingId === member.userId}
                    aria-label={`Remove ${member.name} from this workspace`}
                    className="
                      w-7 h-7 rounded-lg
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
            </div>
          )
        })}
      </div>
    </div>
  )
}