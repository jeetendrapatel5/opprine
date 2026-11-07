'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import NotificationDropdown from './NotificationDropdown'
import type { NotificationData } from './types'

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
  // The initial render already knows it is waiting for the first response.
  // Polling does not switch the dropdown back into its loading state.
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading')
  const [loadingMore, setLoadingMore] = useState(false)

  const latestControllerRef = useRef<AbortController | null>(null)
  const moreControllerRef = useRef<AbortController | null>(null)

  const fetchMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return

    moreControllerRef.current?.abort()
    const controller = new AbortController()
    moreControllerRef.current = controller
    setLoadingMore(true)

    try {
      const response = await fetch(
        `/api/notifications?limit=20&cursor=${encodeURIComponent(nextCursor)}`,
        { signal: controller.signal, cache: 'no-store' }
      )
      if (!response.ok) throw new Error(`Request failed: ${response.status}`)

      const data: NotificationsResponse = await response.json()
      if (controller.signal.aborted) return

      setNotifications((current) => {
        const existingIds = new Set(current.map((notification) => notification.id))
        const additional = data.notifications.filter((notification) => !existingIds.has(notification.id))
        return [...current, ...additional]
      })
      setNextCursor(data.nextCursor)
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error('Failed to load more notifications', err)
      }
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false)
      if (moreControllerRef.current === controller) {
        moreControllerRef.current = null
      }
    }
  }, [nextCursor, loadingMore])

  useEffect(() => {
    // Defined inside the effect: it only sets state after the awaited
    // response, so nothing here updates state synchronously during the effect.
    const fetchLatest = async () => {
      // Prevent overlapping polls from applying responses out of order.
      latestControllerRef.current?.abort()
      const controller = new AbortController()
      latestControllerRef.current = controller

      try {
        const response = await fetch('/api/notifications?limit=20', {
          signal: controller.signal,
          cache: 'no-store',
        })
        if (!response.ok) throw new Error(`Request failed: ${response.status}`)

        const data: NotificationsResponse = await response.json()
        if (controller.signal.aborted) return

        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
        setNextCursor(data.nextCursor)
        setStatus('idle')
      } catch (err) {
        if (controller.signal.aborted) return
        console.error('Failed to load notifications', err)
        setStatus('error')
      } finally {
        if (latestControllerRef.current === controller) {
          latestControllerRef.current = null
        }
      }
    }

    void fetchLatest()
    const intervalId = window.setInterval(() => {
      void fetchLatest()
    }, POLL_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
      latestControllerRef.current?.abort()
      moreControllerRef.current?.abort()
    }
  }, [])

  const markAsRead = useCallback((id: string) => {
    const notification = notifications.find((item) => item.id === id)
    if (!notification || notification.read) return

    setNotifications((current) =>
      current.map((item) =>
        item.id === id && !item.read
          ? { ...item, read: true, readAt: new Date().toISOString() }
          : item
      )
    )
    setUnreadCount((current) => Math.max(0, current - 1))

    fetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }).catch((err) =>
      console.error('Failed to mark notification as read', err)
    )
  }, [notifications])

  const markAllAsRead = useCallback(() => {
    setNotifications((current) =>
      current.map((item) =>
        item.read ? item : { ...item, read: true, readAt: new Date().toISOString() }
      )
    )
    setUnreadCount(0)
    fetch('/api/notifications/read-all', { method: 'POST' }).catch((err) =>
      console.error('Failed to mark all notifications as read', err)
    )
  }, [])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) return

    const unreadIds = notifications.filter((item) => !item.read).map((item) => item.id)
    if (unreadIds.length === 0) return

    const readAt = new Date().toISOString()
    setNotifications((current) =>
      current.map((item) => (item.read ? item : { ...item, read: true, readAt }))
    )
    setUnreadCount(0)

    Promise.all(
      unreadIds.map((id) =>
        fetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' })
      )
    ).catch((err) => console.error('Failed to auto-mark notifications as read', err))
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[var(--color-fp-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-fp-surface-2,var(--color-fp-surface))] hover:text-[var(--color-fp-text-primary)]"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute right-[3px] top-[3px] flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[var(--color-fp-accent)] px-[3px] text-[10px] font-semibold leading-none tabular-nums text-black ring-2 ring-[var(--color-fp-base)]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[380px] overflow-hidden rounded-xl border-[var(--color-fp-border)] bg-[var(--color-fp-base)] p-0 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.18)]"
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