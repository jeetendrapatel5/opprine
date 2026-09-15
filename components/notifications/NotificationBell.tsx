"use client"

// components/notifications/NotificationBell.tsx
//
// This is the ONLY component in the notification feature that calls
// fetch(). It owns:
//   - the list of notifications currently in memory
//   - the unread badge count
//   - loading / error state
//   - the lightweight polling timer
//
// NotificationDropdown, NotificationList, and NotificationItem (the
// three files below this one) are all "dumb" — they take data and
// callback functions as props and never touch the network themselves.
// That split matters for one concrete reason: the spec asks for this to
// be upgradeable to real-time delivery (SSE/WebSockets) later WITHOUT
// rewriting the rest of the system. Because only this one file knows
// HOW notifications get fetched, swapping polling for a live connection
// later means editing only this file — the other three don't change at
// all.
//
// TODO: import path — drop <NotificationBell /> into your top
// horizontal header/navbar component. I don't have that file, so I
// can't wire it in myself; this component just needs to render
// somewhere in that header, e.g.:
//   import NotificationBell from '@/components/notifications/NotificationBell'
//   ...
//   <NotificationBell />

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import NotificationDropdown from './NotificationDropdown'
import type { NotificationData } from './types'

// How often to silently re-check for new notifications while the tab is
// open. 60s matches the spec's "lightweight refresh strategy" — frequent
// enough to feel current, far too infrequent to add meaningful load even
// at thousands of concurrent users. If you add real-time delivery later,
// this whole interval gets deleted from THIS file only.
const POLL_INTERVAL_MS = 60_000

type NotificationsResponse = {
  notifications: NotificationData[]
  unreadCount: number
  nextCursor: string | null
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [loadingMore, setLoadingMore] = useState(false)

  // Guards against a slow background poll response landing AFTER this
  // component has unmounted (e.g. the user navigated away while the
  // request was in flight) — without this, calling setState on an
  // unmounted component would log a React warning.
  const isMounted = useRef(true)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Fetches the FIRST page fresh. Used on mount, on every poll tick, and
  // you can call it again after any action that should refresh state
  // from the server.
  const fetchLatest = useCallback(async () => {
    // Only show the loading spinner on the very FIRST load — a
    // background poll tick refreshing silently shouldn't flash a
    // spinner over content the user is already looking at.
    setStatus((current) => (current === 'idle' && notifications.length === 0 ? 'loading' : current))
    try {
      const res = await fetch('/api/notifications?limit=20')
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      const data: NotificationsResponse = await res.json()
      if (!isMounted.current) return
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
      setNextCursor(data.nextCursor)
      setStatus('idle')
    } catch (err) {
      if (!isMounted.current) return
      console.error('Failed to load notifications', err)
      setStatus('error')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetches the NEXT page and APPENDS it — used by "Load more" inside
  // the dropdown. Never replaces existing rows.
  const fetchMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/notifications?limit=20&cursor=${encodeURIComponent(nextCursor)}`)
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      const data: NotificationsResponse = await res.json()
      if (!isMounted.current) return
      setNotifications((prev) => [...prev, ...data.notifications])
      setNextCursor(data.nextCursor)
    } catch (err) {
      console.error('Failed to load more notifications', err)
    } finally {
      if (isMounted.current) setLoadingMore(false)
    }
  }, [nextCursor, loadingMore])

  // Initial load, plus the polling loop. Runs once — the interval is
  // cleared on unmount so it can never stack up multiple timers.
  useEffect(() => {
    fetchLatest()
    const interval = setInterval(fetchLatest, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Marks ONE notification read. OPTIMISTIC: the UI updates instantly,
  // the API call happens in the background. If that call fails, this
  // function does not roll the UI back — the next poll tick (at most
  // 60s later) will correct it if something genuinely went wrong. A
  // click needs to feel instant here; this isn't a payment, so eventual
  // correction is an acceptable trade-off.
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && !n.read ? { ...n, read: true, readAt: new Date().toISOString() } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
    fetch(`/api/notifications/${id}/read`, { method: 'POST' }).catch((err) =>
      console.error('Failed to mark notification as read', err)
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => (n.read ? n : { ...n, read: true, readAt: new Date().toISOString() })))
    setUnreadCount(0)
    fetch('/api/notifications/read-all', { method: 'POST' }).catch((err) =>
      console.error('Failed to mark all notifications as read', err)
    )
  }, [])

  // Auto-mark-as-read: opening the dropdown counts as "the user has now
  // SEEN these." This satisfies the "automatically mark as read when
  // appropriate" requirement without per-row visibility tracking (e.g.
  // IntersectionObserver) — overkill for a dropdown where every loaded
  // row is already fully visible the instant it opens.
  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) return

    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length === 0) return

    setNotifications((prev) => prev.map((n) => (n.read ? n : { ...n, read: true, readAt: new Date().toISOString() })))
    setUnreadCount(0)
    Promise.all(unreadIds.map((id) => fetch(`/api/notifications/${id}/read`, { method: 'POST' }))).catch((err) =>
      console.error('Failed to auto-mark notifications as read', err)
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          className="relative w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-fp-text-secondary)] hover:text-[var(--color-fp-text-primary)] hover:bg-[var(--color-fp-surface-2,var(--color-fp-surface))] transition-colors duration-150 cursor-pointer"
        >
          <Bell className="w-[18px] h-[18px]" strokeWidth={1.75} />
          {unreadCount > 0 && (
            // The ring is the same color as the surface the badge sits
            // on, so it reads as inset into the icon rather than a flat
            // circle floating on top of it — the same trick iOS/macOS
            // use for notification badges.
            <span className="absolute top-[3px] right-[3px] flex items-center justify-center min-w-[15px] h-[15px] px-[3px] rounded-full bg-[var(--color-fp-accent)] text-black text-[10px] font-semibold leading-none tabular-nums ring-2 ring-[var(--color-fp-base)]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[380px] p-0 overflow-hidden rounded-xl bg-[var(--color-fp-base)] border-[var(--color-fp-border)] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.18)]"
      >
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          status={status}
          hasMore={Boolean(nextCursor)}
          loadingMore={loadingMore}
          onLoadMore={fetchMore}
          onMarkAllAsRead={markAllAsRead}
          onItemClick={markAsRead}
        />
      </PopoverContent>
    </Popover>
  )
}