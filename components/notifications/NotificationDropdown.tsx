"use client"

// components/notifications/NotificationDropdown.tsx
//
// Pure presentation — everything here arrives as props from
// NotificationBell. This component has never heard of fetch(). That
// separation is what makes it reusable later (e.g. on a future
// "/dashboard/notifications" full-page view) without dragging the
// polling/state logic along with it — you'd just feed it different
// props from a different parent.

import NotificationList from './NotificationList'
import type { NotificationData } from './types'

type Props = {
  notifications: NotificationData[]
  unreadCount: number
  status: 'idle' | 'loading' | 'error'
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
  onMarkAllAsRead: () => void
  onItemClick: (id: string) => void
}

export default function NotificationDropdown({
  notifications,
  unreadCount,
  status,
  hasMore,
  loadingMore,
  onLoadMore,
  onMarkAllAsRead,
  onItemClick,
}: Props) {
  return (
    <div className="flex flex-col max-h-[520px]">
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[var(--color-fp-border)]">
        <div>
          <p className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--color-fp-text-primary)]">
            Notifications
          </p>
          {unreadCount > 0 && (
            <p className="mt-0.5 text-xs tabular-nums text-[var(--color-fp-text-tertiary)]">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllAsRead}
            className="shrink-0 text-xs font-medium text-[var(--color-fp-accent)] hover:opacity-70 transition-opacity duration-150 cursor-pointer"
          >
            Mark all as read
          </button>
        )}
      </div>

      <NotificationList
        notifications={notifications}
        status={status}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={onLoadMore}
        onItemClick={onItemClick}
      />
    </div>
  )
}