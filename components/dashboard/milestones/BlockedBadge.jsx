// components/dashboard/milestones/BlockedBadge.jsx
//
// The "waiting on client" chip on a milestone row. Kept as its own tiny file so
// MilestoneRow only needs one import and one line, and so it can be tested alone.
//
// `blocked` is that milestone's entry from the ledger (lib/blocked-time.js):
//   { blockedDays, openBlockingCount, oldestOpenSince }   (or null/undefined)
//
// Two looks:
//   amber    "Waiting on client - 5d"   something blocking is open RIGHT NOW
//   neutral  "Blocked 7d"               history: how long this milestone waited
//                                       on the client in total (also kept on
//                                       completed milestones, as the record)
// Nothing at all when the milestone never waited on the client.
//
// The 5d is the CURRENT wait (oldest open item); the 7d is the lifetime total.

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

const DAY_MS = 24 * 60 * 60 * 1000

export default function BlockedBadge({ blocked, completed = false }) {
  // Keep time in state so rendering stays pure. The clock is read in a timer
  // callback, then refreshed when the current wait reaches another full day.
  const [now, setNow] = useState(null)
  const isWaiting = Boolean(
    !completed && blocked?.openBlockingCount > 0 && blocked?.oldestOpenSince,
  )
  const oldestOpenSinceTime = isWaiting
    ? new Date(blocked.oldestOpenSince).getTime()
    : Number.NaN

  useEffect(() => {
    if (!isWaiting || !Number.isFinite(oldestOpenSinceTime)) return undefined

    let timeoutId

    const updateClock = () => {
      const currentTime = Date.now()
      setNow(currentTime)

      const elapsedDays = Math.max(
        0,
        Math.floor((currentTime - oldestOpenSinceTime) / DAY_MS),
      )
      const nextUpdateAt = oldestOpenSinceTime + (elapsedDays + 1) * DAY_MS
      timeoutId = setTimeout(updateClock, Math.max(1000, nextUpdateAt - currentTime))
    }

    // Defer the initial update so the effect doesn't synchronously trigger a render.
    timeoutId = setTimeout(updateClock, 0)

    return () => clearTimeout(timeoutId)
  }, [isWaiting, oldestOpenSinceTime])

  if (!blocked) return null

  // A completed milestone is no longer "waiting" on anything.
  if (!completed && blocked.openBlockingCount > 0) {
    const days = Number.isFinite(oldestOpenSinceTime) && now !== null
      ? Math.max(0, Math.floor((now - oldestOpenSinceTime) / DAY_MS))
      : 0

    return (
      <span
        title="This milestone is waiting on your client"
        className="shrink-0 flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-fp-warning/10 text-fp-warning"
      >
        <Clock className="w-2.5 h-2.5" />
        Waiting on client{days >= 1 ? ` · ${days}d` : ''}
      </span>
    )
  }

  if (blocked.blockedDays >= 1) {
    return (
      <span
        title="Total time this milestone spent waiting on your client"
        className="shrink-0 flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-fp-border/50 text-fp-text-tertiary"
      >
        <Clock className="w-2.5 h-2.5" />
        Blocked {blocked.blockedDays}d
      </span>
    )
  }

  return null
}