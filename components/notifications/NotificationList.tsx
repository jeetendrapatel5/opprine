"use client"

// components/notifications/NotificationList.tsx
//
// Renders exactly ONE of four states at a time: loading, error, empty,
// or the actual scrollable list. Written as a flat if/else chain (not
// nested ternaries) on purpose — it's the easiest shape for someone
// else reading this file to scan and confirm all four states are
// actually handled, per the spec's explicit requirement for each one.
//
// All four states share the same min-height so the popover doesn't
// visibly resize as it moves between them (e.g. loading -> populated,
// or populated -> error on a failed poll).

import { Bell, Loader2, WifiOff } from 'lucide-react'
import NotificationItem from './NotificationItem'
import type { NotificationData } from './types'

const STATE_MIN_HEIGHT = 'min-h-[220px]'

type Props = {
  notifications: NotificationData[]
  status: 'idle' | 'loading' | 'error'
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
  onItemClick: (id: string) => void
}

export default function NotificationList({
  notifications,
  status,
  hasMore,
  loadingMore,
  onLoadMore,
  onItemClick,
}: Props) {
  // Loading state — only while there's nothing on screen yet. If we
  // already have rows and a background poll happens to be mid-flight,
  // we keep showing those rows rather than replacing them with a
  // spinner.
  if (status === 'loading' && notifications.length === 0) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center ${STATE_MIN_HEIGHT}`}>
        <Loader2 className="w-4 h-4 animate-spin text-[var(--color-fp-text-tertiary)]" />
      </div>
    )
  }

  // Error state — only shown if we have NO data to fall back on. A poll
  // that fails after we already successfully loaded once just keeps
  // showing the last good data instead of replacing it with an error.
  // Icon is a neutral surface tint (not accent) so it doesn't read as
  // an on-brand moment — it's a muted, "something didn't load" signal.
  if (status === 'error' && notifications.length === 0) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center ${STATE_MIN_HEIGHT} px-6 text-center`}>
        <div className="mb-3 flex items-center justify-center w-11 h-11 rounded-[12px] bg-[var(--color-fp-surface-2,var(--color-fp-surface))]">
          <WifiOff className="w-[18px] h-[18px] text-[var(--color-fp-text-tertiary)]" strokeWidth={1.75} />
        </div>
        <p className="text-sm text-[var(--color-fp-text-secondary)]">Couldn&apos;t load notifications.</p>
        <p className="mt-1 text-xs text-[var(--color-fp-text-tertiary)]">Check your connection and try again.</p>
      </div>
    )
  }

  // Empty state. Icon uses the accent tint (matching each row's icon
  // treatment) since this is an expected, positive state rather than a
  // failure.
  if (notifications.length === 0) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center ${STATE_MIN_HEIGHT} px-6 text-center`}>
        <div className="mb-3 flex items-center justify-center w-11 h-11 rounded-[12px] bg-[var(--color-fp-accent)]/8">
          <Bell className="w-[18px] h-[18px] text-[var(--color-fp-accent)]/60" strokeWidth={1.75} />
        </div>
        <p className="text-sm font-medium text-[var(--color-fp-text-primary)]">You&apos;re all caught up</p>
        <p className="mt-1 text-xs text-[var(--color-fp-text-tertiary)]">New activity will show up here.</p>
      </div>
    )
  }

  // Populated state — the scrollable list itself. The scrollbar rules
  // below just thin out and re-color the native scrollbar to match the
  // panel instead of the browser's oversized default; they don't change
  // scroll behavior.
  return (
    <div
      className="flex-1 overflow-y-auto
        [scrollbar-width:thin] [scrollbar-color:var(--color-fp-border)_transparent]
        [&::-webkit-scrollbar]:w-[6px]
        [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:rounded-full
        [&::-webkit-scrollbar-thumb]:bg-[var(--color-fp-border)]
        [&::-webkit-scrollbar-thumb:hover]:bg-[var(--color-fp-text-tertiary)]"
    >
      {notifications.map((n) => (
        <NotificationItem key={n.id} notification={n} onClick={onItemClick} />
      ))}

      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loadingMore}
          className="flex items-center justify-center gap-1.5 w-full py-3 border-t border-[var(--color-fp-border)] text-xs font-medium text-[var(--color-fp-text-secondary)] hover:text-[var(--color-fp-text-primary)] hover:bg-[var(--color-fp-surface-2,var(--color-fp-surface))] disabled:opacity-50 disabled:hover:bg-transparent transition-colors duration-150 cursor-pointer"
        >
          {loadingMore ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading
            </>
          ) : (
            'Load more'
          )}
        </button>
      )}
    </div>
  )
}