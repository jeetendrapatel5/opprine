"use client"

// components/notifications/NotificationItem.tsx
//
// One row. Resolves its own icon + link target from a small local
// config that mirrors NOTIFICATION_META in
// lib/notifications/constants.js — so adding a brand-new notification
// TYPE never requires touching this file's LAYOUT, only adding one
// entry to TYPE_ICON (icon name) and one case to buildHref (link
// target) below, matching whatever you added to NOTIFICATION_META on
// the server side. A React icon component isn't something the server
// can send over JSON, which is why the server sends a STRING name and
// this file does the name → component lookup.

import Link from 'next/link'
import {
  CircleCheck,
  UserRoundPlus,
  FolderKanban,
  MessageSquareText,
  Paperclip,
  CheckCircle2,
  Bell,
  type LucideIcon,
} from 'lucide-react'
import type { NotificationData } from './types'

const ICONS: Record<string, LucideIcon> = {
  CircleCheck,
  UserRoundPlus,
  FolderKanban,
  MessageSquareText,
  Paperclip,
  CheckCircle2,
}

const TYPE_ICON: Record<string, string> = {
  MILESTONE_APPROVAL_PENDING: 'CircleCheck',
  WORKSPACE_INVITE: 'UserRoundPlus',
  PROJECT_ASSIGNED: 'FolderKanban',
  MILESTONE_UPDATE_POSTED: 'MessageSquareText',
  MILESTONE_DELIVERABLE_UPLOADED: 'Paperclip',
  TASK_COMPLETED: 'CheckCircle2',
  PROJECT_UPDATE_POSTED: 'MessageSquareText',
  PROJECT_FILE_UPLOADED: 'Paperclip',
}

// Mirrors buildHref() per type in NOTIFICATION_META
// (lib/notifications/constants.js). Duplicated here rather than shared
// because that file also runs on the server and this one is
// client-only — not worth a shared module for a handful of one-line
// functions, but keep both in sync if you add a type.
function buildHref(n: NotificationData): string | null {
  switch (n.type) {
    case 'MILESTONE_APPROVAL_PENDING':
    case 'MILESTONE_UPDATE_POSTED':
    case 'MILESTONE_DELIVERABLE_UPLOADED':
      return n.projectId ? `/dashboard/projects/${n.projectId}?milestone=${n.metadata?.milestoneId ?? ''}` : null
    case 'WORKSPACE_INVITE':
      return n.metadata?.inviteToken ? `/invite/${n.metadata.inviteToken}` : null
    case 'PROJECT_ASSIGNED':
    case 'TASK_COMPLETED':
    case 'PROJECT_UPDATE_POSTED':
    case 'PROJECT_FILE_UPLOADED':
      return n.projectId ? `/dashboard/projects/${n.projectId}` : null
    default:
      return null
  }
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(iso).toLocaleDateString()
}

type Props = {
  notification: NotificationData
  onClick: (id: string) => void
}

export default function NotificationItem({ notification: n, onClick }: Props) {
  const Icon = ICONS[TYPE_ICON[n.type]] ?? Bell
  const href = buildHref(n)

  const row = (
    <div className="flex items-start gap-3 px-5 py-3.5 border-b border-[var(--color-fp-border)] last:border-b-0 hover:bg-[var(--color-fp-surface-2,var(--color-fp-surface))] transition-colors duration-150">
      {/* Rounded-square "app icon" treatment (macOS Notification Center),
          not a circular avatar — reads as a type glyph, not a person. */}
      <div className="flex items-center justify-center shrink-0 w-9 h-9 rounded-[10px] bg-[var(--color-fp-accent)]/10">
        <Icon className="w-4 h-4 text-[var(--color-fp-accent)]" strokeWidth={1.75} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <p
            className={`truncate text-[13px] leading-snug text-[var(--color-fp-text-primary)] ${
              n.read ? 'font-medium' : 'font-semibold'
            }`}
          >
            {n.title}
          </p>
          <span className="shrink-0 text-[11px] tabular-nums text-[var(--color-fp-text-tertiary)]">
            {relativeTime(n.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-fp-text-secondary)] line-clamp-2">
          {n.message}
        </p>
      </div>

      {/* Unread is conveyed by the bolder title above plus this dot —
          not a full-row background tint, which reads heavier and dates
          faster. Same pattern as Mail's unread indicator. */}
      {!n.read && <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-fp-accent)]" />}
    </div>
  )

  // Authorization for the destination is the DESTINATION PAGE's job
  // (e.g. the project detail page's own requireProjectMembership()
  // call) — this component just points at the URL, same as it would
  // for any other link into that page.
  if (!href) {
    return (
      <button type="button" onClick={() => onClick(n.id)} className="w-full text-left cursor-pointer">
        {row}
      </button>
    )
  }

  return (
    <Link href={href} onClick={() => onClick(n.id)} className="block cursor-pointer">
      {row}
    </Link>
  )
}