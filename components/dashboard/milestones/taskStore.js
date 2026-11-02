// components/dashboard/milestones/taskStore.js
//
// A tiny in-memory cache for TaskBoard data. No library — just a Map
// plus React's built-in useSyncExternalStore.
//
// WHY THIS FILE EXISTS
// Before, TaskBoard kept tasks in its own useState(null). That state was
// destroyed every time the milestone panel collapsed, and the request only
// started AFTER the user clicked. So every open was a cold load.
// Now the data lives here, outside React, so:
//   1. closing and re-opening a milestone shows the last data instantly,
//      then refreshes it quietly in the background;
//   2. MilestoneRow can start the request BEFORE the click (prefetch);
//   3. two callers asking for the same data share one request.
//
// SECURITY NOTE
// This cache only decides what to SHOW. Every fetch still goes to the API,
// and the API still runs requireProjectMembership. Keys include the user id,
// so one user's data is never shown to another user in the same tab. If the
// API answers 401/403/404, the cached copy is thrown away.

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import axios from 'axios'

// If data was fetched less than this long ago, don't fetch it again.
const FRESH_MS = 5000

// Immutable "nothing loaded yet" snapshot. Reused so React sees a stable value.
const EMPTY = { data: undefined, error: null, isFetching: false }

// key -> { snap, rev, inflight, fetchedAt, listeners }
const entries = new Map()

// ── Raw fetchers (same endpoints and response shapes as before) ───────────
const fetchTasks = (milestoneId) =>
  axios.get('/api/tasks', { params: { milestoneId } }).then(({ data }) => data)

const fetchMembers = (projectId) =>
  axios.get(`/api/projects/${projectId}/members`).then(({ data }) => data.members)

const tasksKey = (userId, milestoneId) => `tasks:${userId}:${milestoneId}`
const membersKey = (userId, projectId) => `members:${userId}:${projectId}`

// ── Core store ────────────────────────────────────────────────────────────

// Get (or create) the record for one key.
//   snap     = what React reads: { data, error, isFetching }
//   rev      = a counter that goes up on every local change. A response that
//              was requested under an older rev is stale and gets thrown away.
//   inflight = the request currently running, if any
function getEntry(key) {
  let entry = entries.get(key)
  if (!entry) {
    entry = { snap: EMPTY, rev: 0, inflight: null, fetchedAt: 0, listeners: new Set() }
    entries.set(key, entry)
  }
  return entry
}

// Replace the snapshot with a new object, then tell every subscribed
// component to re-read it.
function setSnap(entry, patch) {
  entry.snap = { ...entry.snap, ...patch }
  entry.listeners.forEach((listener) => listener())
}

// Fetch a key unless we already have a good reason not to.
// Never rejects: errors are stored in the snapshot instead, so callers
// don't need try/catch.
function load(key, fetcher, maxAgeMs = FRESH_MS) {
  const entry = getEntry(key)

  // A request is already running AND nothing changed locally since it
  // started -> just share it (this removes duplicate requests).
  if (entry.inflight && entry.inflight.rev === entry.rev) return entry.inflight.promise

  // We have data that is still fresh -> nothing to do.
  if (entry.snap.data !== undefined && Date.now() - entry.fetchedAt < maxAgeMs) {
    return Promise.resolve()
  }

  const run = { rev: entry.rev }
  entry.inflight = run
  setSnap(entry, { isFetching: true, error: null })

  run.promise = fetcher().then(
    (data) => {
      if (entry.inflight !== run) return // a newer request replaced this one
      entry.inflight = null
      if (entry.rev === run.rev) {
        entry.fetchedAt = Date.now()
        setSnap(entry, { data, error: null, isFetching: false })
      } else {
        // A local change happened while we were waiting, so this response
        // may be older than what the user sees. Drop it; the change that
        // caused it ends with a refresh anyway.
        setSnap(entry, { isFetching: false })
      }
    },
    (error) => {
      if (entry.inflight !== run) return
      entry.inflight = null
      const status = error?.response?.status
      const lostAccess = status === 401 || status === 403 || status === 404
      setSnap(entry, {
        data: lostAccess ? undefined : entry.snap.data, // keep stale data on network errors
        error,
        isFetching: false,
      })
    }
  )
  return run.promise
}

// Change cached data locally (used for instant, optimistic UI updates).
// Bumping rev makes any response already on its way count as stale.
function write(key, updater) {
  const entry = getEntry(key)
  entry.rev += 1
  if (entry.snap.data !== undefined) {
    setSnap(entry, { data: updater(entry.snap.data) })
  }
}

// Throw away what we think we know and fetch the truth from the server now.
function invalidate(key, fetcher) {
  const entry = getEntry(key)
  entry.rev += 1
  return load(key, fetcher, 0)
}

// React glue: subscribe a component to one key and start the (deduped,
// freshness-checked) fetch on mount.
function useResource(key, fetcher) {
  const entry = getEntry(key)

  const subscribe = useCallback(
    (onChange) => {
      entry.listeners.add(onChange)
      return () => entry.listeners.delete(onChange)
    },
    [entry]
  )

  const snap = useSyncExternalStore(subscribe, () => entry.snap, () => EMPTY)

  useEffect(() => {
    load(key, fetcher)
  }, [key, fetcher])

  const reload = useCallback(() => load(key, fetcher, 0), [key, fetcher])

  return { data: snap.data, error: snap.error, isFetching: snap.isFetching, reload }
}

// ── Public API used by components ─────────────────────────────────────────

export function useTasks(userId, milestoneId) {
  const fetcher = useCallback(() => fetchTasks(milestoneId), [milestoneId])
  return useResource(tasksKey(userId, milestoneId), fetcher)
}

export function useProjectMembers(userId, projectId) {
  const fetcher = useCallback(() => fetchMembers(projectId), [projectId])
  return useResource(membersKey(userId, projectId), fetcher)
}

// Start loading tasks + members before the board mounts
// (MilestoneRow calls this on hover / focus / press).
export function prefetchBoard(userId, milestoneId, projectId) {
  if (!userId || !milestoneId || !projectId) return
  load(tasksKey(userId, milestoneId), () => fetchTasks(milestoneId))
  load(membersKey(userId, projectId), () => fetchMembers(projectId))
}

// Instant local edit of the cached task list.
export function updateCachedTasks(userId, milestoneId, updater) {
  write(tasksKey(userId, milestoneId), updater)
}

// Re-fetch the task list from the server (call after any mutation settles).
export function refreshTasks(userId, milestoneId) {
  return invalidate(tasksKey(userId, milestoneId), () => fetchTasks(milestoneId))
}

// Forget everything (call on sign-out if you sign out without a full reload).
export function clearTaskCache() {
  entries.clear()
}