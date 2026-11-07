// Client Component: the remove action requires confirmation and pending state.
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

const EMPTY_MEMBERS = []

// Keep this UI rule aligned with the authoritative check in lib/workspace.js.
// The API remains responsible for enforcing permissions.
const ROLE_TEXT_CLASSES = {
  OWNER: 'text-fp-accent',
  ADMIN: 'text-fp-warning',
  MEMBER: 'text-fp-text-tertiary',
}

const ROLE_RANK = { OWNER: 3, ADMIN: 2, MEMBER: 1 }

export default function MembersList({ initialMembers = EMPTY_MEMBERS, currentUserId, currentUserRole }) {
  const router = useRouter()
  const [removalState, setRemovalState] = useState(() => ({
    source: initialMembers,
    removedIds: [],
  }))
  const [removingId, setRemovingId] = useState(null)
  const [error, setError] = useState(null)

  // Server props remain the source of truth. Local removals are only an
  // optimistic overlay for the current props; a refreshed server array
  // automatically becomes the new base without an effect-driven setState.
  const removedIds = removalState.source === initialMembers ? removalState.removedIds : []
  const members = initialMembers.filter((member) => !removedIds.includes(member.userId))

  async function handleRemove(member) {
    if (removingId !== null) return

    const confirmed = window.confirm(
      `Remove ${member.name} from this workspace? They'll lose access immediately.`
    )
    if (!confirmed) return

    setError(null)
    setRemovingId(member.userId)

    try {
      const response = await fetch(`/api/workspace/members/${encodeURIComponent(member.userId)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Could not remove this member.')
      }

      setRemovalState((current) => ({
        source: initialMembers,
        removedIds: [
          ...(current.source === initialMembers ? current.removedIds : []),
          member.userId,
        ],
      }))
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
        <div role="alert" className="mb-3 rounded-lg border border-fp-danger/20 bg-fp-danger/10 px-3 py-2">
          <p className="text-xs text-fp-danger">{error}</p>
        </div>
      )}

      <div className="divide-y divide-fp-border overflow-hidden rounded-xl border border-fp-border bg-fp-surface">
        {members.map((member) => {
          const isYou = member.userId === currentUserId
          const currentRank = ROLE_RANK[currentUserRole] ?? 0
          const memberRank = ROLE_RANK[member.role] ?? 0
          const removable = !isYou && currentRank > memberRank
          const initial = member.name?.[0]?.toUpperCase() ?? '?'
          const isRemoving = removingId === member.userId

          return (
            <div key={member.userId} className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-fp-accent/20 bg-fp-accent/15">
                  <span className="text-sm font-bold leading-none text-fp-accent">{initial}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-fp-text-primary">
                    {member.name}
                    {isYou && <span className="font-normal text-fp-text-tertiary"> (you)</span>}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-fp-text-tertiary">{member.email}</p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                    ROLE_TEXT_CLASSES[member.role] ?? ROLE_TEXT_CLASSES.MEMBER
                  }`}
                >
                  {member.role}
                </span>

                {removable && (
                  <button
                    type="button"
                    onClick={() => handleRemove(member)}
                    disabled={removingId !== null}
                    aria-label={`Remove ${member.name} from this workspace`}
                    aria-busy={isRemoving}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-fp-text-tertiary transition-colors duration-150 hover:bg-fp-danger/10 hover:text-fp-danger disabled:pointer-events-none disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
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
