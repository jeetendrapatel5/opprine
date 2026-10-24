// lib/blocked-time.js
//
// The "waiting on client" ledger. PURE functions only: no database, no
// framework, no imports - so they are trivial to test (lib/blocked-time.test.js)
// and safe to run anywhere (server, scripts, tests).
//
// THE IDEA
// --------
// Every client request has ONE waiting period:
//
//   starts at  createdAt
//   ends at    submittedAt (client answered)  or  cancelledAt (we withdrew it)
//              - whichever happened - or "now" if it is still open.
//
// "Blocked time" is how long we were stuck waiting for the client. If two
// blocking requests were open at the same time, that time must count ONCE,
// not twice (otherwise 3 open requests would triple the number of days).
// So we turn each waiting period into an interval [start, end) and MERGE
// overlapping intervals before adding them up.
//
//   request A  |==========|
//   request B        |==========|
//   merged     |================|      <- counted once
//
// Only requests with blocksWork = true count. Nothing here is stored in the
// database: it is always recomputed from the timestamps, so it can never get
// out of sync with them.

export const DAY_MS = 24 * 60 * 60 * 1000

const toMs = (value) => (value instanceof Date ? value.getTime() : new Date(value).getTime())

// Merges overlapping or touching [start, end] pairs (milliseconds).
// Drops anything invalid: NaN dates, or intervals that are empty/negative
// (e.g. a submittedAt that is somehow earlier than createdAt).
export function mergeIntervals(intervals) {
  const valid = intervals
    .filter(([start, end]) => Number.isFinite(start) && Number.isFinite(end) && end > start)
    .sort((a, b) => a[0] - b[0])

  const merged = []
  for (const [start, end] of valid) {
    const last = merged[merged.length - 1]
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end)
    } else {
      merged.push([start, end])
    }
  }
  return merged
}

// requests: [{ blocksWork, createdAt, submittedAt, cancelledAt }]
//           (Date objects or ISO strings; submittedAt/cancelledAt may be null)
// now:      the moment to treat as "now" (injectable so tests are deterministic)
//
// Returns:
//   blockedMs          total merged waiting time, in milliseconds
//   blockedDays        the same, rounded DOWN to whole days (for display)
//   openBlockingCount  blocking requests still waiting on the client
//   oldestOpenSince    Date the longest-open blocking request was created, or null
export function computeBlockedSummary(requests, now = new Date()) {
  const nowMs = toMs(now)
  const intervals = []
  let openBlockingCount = 0
  let oldestOpenMs = null

  for (const request of requests) {
    if (!request.blocksWork) continue

    const startMs = toMs(request.createdAt)
    const isOpen = !request.submittedAt && !request.cancelledAt

    let endMs = nowMs
    if (request.submittedAt) endMs = toMs(request.submittedAt)
    else if (request.cancelledAt) endMs = toMs(request.cancelledAt)

    // Never count time that hasn't happened yet.
    intervals.push([startMs, Math.min(endMs, nowMs)])

    if (isOpen && Number.isFinite(startMs)) {
      openBlockingCount += 1
      if (oldestOpenMs === null || startMs < oldestOpenMs) oldestOpenMs = startMs
    }
  }

  const blockedMs = mergeIntervals(intervals).reduce((sum, [start, end]) => sum + (end - start), 0)

  return {
    blockedMs,
    blockedDays: Math.floor(blockedMs / DAY_MS),
    openBlockingCount,
    oldestOpenSince: oldestOpenMs === null ? null : new Date(oldestOpenMs),
  }
}

// The three views the UI needs, from one list of a project's requests:
//   project       - blocked time across the whole project (overlaps merged
//                   ACROSS milestones too)
//   milestones    - { [milestoneId]: summary } for requests tied to a milestone
//   noMilestone   - summary for requests with no milestone
export function groupBlockedByMilestone(requests, now = new Date()) {
  const byMilestone = new Map()
  const loose = []

  for (const request of requests) {
    if (request.milestoneId) {
      if (!byMilestone.has(request.milestoneId)) byMilestone.set(request.milestoneId, [])
      byMilestone.get(request.milestoneId).push(request)
    } else {
      loose.push(request)
    }
  }

  const milestones = {}
  for (const [milestoneId, list] of byMilestone) {
    milestones[milestoneId] = computeBlockedSummary(list, now)
  }

  return {
    project: computeBlockedSummary(requests, now),
    milestones,
    noMilestone: computeBlockedSummary(loose, now),
  }
}