'use client'

// components/portal/ProjectTeamMember.jsx
// ─────────────────────────────────────────────────────────────────────────────
// One avatar in the "Team Behind Your Project" stack. Hovering, clicking,
// or tapping it opens a lightweight Popover with that person's photo,
// name, and project role — enough for the client to know who's who
// without a modal interrupting the rest of the page.
//
// Client Component (needs open/closed + hover-timer state) — kept as
// its own file so it's reusable anywhere a single staffed person needs
// to render + explain themselves, not just inside ProjectTeam's row.
//
// Why a hand-rolled hover open/close instead of shadcn's HoverCard:
// the brief asked specifically for a Popover — a HoverCard primitive
// exists in Radix for exactly this "preview on hover" pattern, but it
// doesn't double as a tap target the same explicit way a Popover's
// controlled open/close does, so this reimplements just the hover
// timing on top of Popover rather than swapping primitives.
//
// Interaction:
//   - Desktop: hovering the avatar opens the popover immediately;
//     moving the mouse away closes it after a short delay (so drifting
//     from the avatar into the popover itself doesn't snap it shut).
//     Clicking also opens/closes it, same as any Popover.
//   - Mobile: there's no hover event on tap at all, so a tap falls
//     straight through to the trigger's own click handling, and
//     tapping elsewhere dismisses it via Popover's normal
//     outside-interaction close.
//   - Keyboard: this is a real <button>, so Tab focuses it and
//     Enter/Space opens it like any Popover trigger; Escape closes it.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState } from 'react'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { getProjectRoleLabel } from '@/lib/projectRoleLabels'

// Delay before a hover-close actually closes the popover. Long enough
// that moving the cursor from the avatar to the popover content (or a
// brief overshoot) doesn't flicker it shut; short enough that it still
// feels responsive, not sticky.
const CLOSE_DELAY_MS = 150

export default function ProjectTeamMember({ member }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef(null)

  const roleLabel = getProjectRoleLabel(member.role)
  // Single-letter initial, amber accent circle — matches the exact
  // fallback style the old FreelancerCard used, so the "a real person
  // is behind this" feeling carries over rather than resetting.
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
        // Click, outside-click, and Escape all go through Radix's own
        // toggle — this just makes sure a pending hover-close timer
        // doesn't fire late and fight whatever just happened.
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
            focus-visible:ring-2 focus-visible:ring-fp-portal-accent
          "
        >
          <Avatar className="w-10 h-10 border border-fp-portal-border">
            <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name} />
            <AvatarFallback className="bg-fp-portal-accent/10 text-fp-portal-accent text-sm font-bold">
              {initial}
            </AvatarFallback>
          </Avatar>
        </button>
      </PopoverTrigger>

      <PopoverContent
        onMouseEnter={cancelScheduledClose}
        onMouseLeave={closeAfterDelay}
        sideOffset={10}
        className="w-auto p-3 bg-fp-portal-surface border-fp-portal-border shadow-lg"
      >
        <div className="flex items-center gap-3">
          <Avatar className="w-11 h-11 border border-fp-portal-border shrink-0">
            <AvatarImage src={member.avatarUrl ?? undefined} alt={member.name} />
            <AvatarFallback className="bg-fp-portal-accent/10 text-fp-portal-accent text-base font-bold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-fp-portal-text-primary text-sm font-semibold leading-snug truncate">
              {member.name}
            </p>
            <p className="text-fp-portal-text-secondary text-[10px] uppercase tracking-widest font-semibold mt-0.5">
              {roleLabel}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}