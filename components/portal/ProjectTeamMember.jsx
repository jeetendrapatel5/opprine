'use client'

// components/portal/ProjectTeamMember.jsx
// One avatar in the team stack. Hover, click or tap opens a small Popover with
// the person's photo, name and project role.
//
// Hover timing is hand-rolled on top of Popover (rather than HoverCard) so the
// avatar is also a normal tap/keyboard target:
//   - Desktop: hover opens; leaving closes after a short delay so the cursor
//     can travel from the avatar into the popover.
//   - Touch: a tap falls through to the trigger's click.
//   - Keyboard: it is a real <button>; Enter/Space opens, Escape closes.

import { useRef, useState } from 'react'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { getProjectRoleLabel } from '@/lib/projectRoleLabels'

// Grace period before a hover-close, so a brief overshoot doesn't flicker it shut.
const CLOSE_DELAY_MS = 150

export default function ProjectTeamMember({ member }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef(null)

  const roleLabel = getProjectRoleLabel(member.role)
  // Initial on an amber circle when there is no photo.
  const initial = member.name?.charAt(0)?.toUpperCase() ?? '?'

  const cancelScheduledClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const openImmediately = () => {
    cancelScheduledClose()
    setOpen(true)
  }

  const closeAfterDelay = () => {
    cancelScheduledClose()
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        // Click, outside-click and Escape go through Radix; this only stops a
        // pending hover-close timer from firing late.
        cancelScheduledClose()
        setOpen(next)
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={openImmediately}
          onMouseLeave={closeAfterDelay}
          aria-label={`${member.name}, ${roleLabel}`}
          className="
            relative rounded-full shrink-0
            ring-2 ring-fp-portal-surface
            transition-transform duration-150
            hover:z-10 hover:scale-105
            focus-visible:z-10 focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-fp-portal-accent-strong
          "
        >
          <Avatar className="w-10 h-10 border border-fp-portal-border">
            <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name} />
            <AvatarFallback className="bg-fp-portal-accent/10 text-fp-portal-accent-strong text-sm font-bold">
              {initial}
            </AvatarFallback>
          </Avatar>
        </button>
      </PopoverTrigger>

      <PopoverContent
        onMouseEnter={cancelScheduledClose}
        onMouseLeave={closeAfterDelay}
        sideOffset={10}
        className="w-auto p-3 bg-fp-portal-surface border-fp-portal-border shadow-fp-pop"
      >
        <div className="flex items-center gap-3">
          <Avatar className="w-11 h-11 border border-fp-portal-border shrink-0">
            <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name} />
            <AvatarFallback className="bg-fp-portal-accent/10 text-fp-portal-accent-strong text-base font-bold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-fp-portal-text-primary text-sm font-semibold leading-snug truncate">
              {member.name}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-fp-portal-text-secondary">
              {roleLabel}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}