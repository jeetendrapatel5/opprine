// lib/pulse-format.js
//
// Small pure helpers for the Project Delivery Pulse panel.
// No React, no imports, so `node --test` can check them.
// The server decides WHAT needs attention; these only WORD and GROUP it.

// ── Shared ──────────────────────────────────────────────────────────────────
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

// Any number-ish value -> a whole number >= 0 (bad input becomes 0).
function safeCount(value) {
  const count = Number(value)
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
}

const toMs = (v) => (v instanceof Date ? v.getTime() : typeof v === 'number' ? v : new Date(v).getTime())

// ── Time ────────────────────────────────────────────────────────────────────

// "Just now / 5m ago / 3h ago / 2d ago".
export function timeAgoShort(date, now = Date.now()) {
  if (!date) return null
  const diffMs = toMs(now) - toMs(date)
  if (!Number.isFinite(diffMs)) return null
  const seconds = Math.floor(Math.max(0, diffMs) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// "7:42 PM". `tz` is an IANA zone ("UTC"); undefined = the viewer's own.
// Newer ICU versions use a narrow no-break space, so it is normalised.
export function timeOfDay(date, tz) {
  if (!date) return null
  const ms = toMs(date)
  if (Number.isNaN(ms)) return null
  return new Date(ms)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz })
    .replace(/\s/g, ' ')
}

// "YYYY-MM-DD" of a moment in that zone (en-CA prints dates this way).
function dayKey(ms, tz) {
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: tz })
}

// The calendar day before a "YYYY-MM-DD" key (pure date maths, no DST traps).
function previousDay(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10)
}

// "Today" / "Yesterday" / "Tue 3 Nov" (+ year when it is not this year).
export function dayLabel(date, now = Date.now(), tz) {
  const ms = toMs(date)
  if (Number.isNaN(ms)) return 'Earlier'
  const key = dayKey(ms, tz)
  const today = dayKey(toMs(now), tz)
  if (key === today) return 'Today'
  if (key === previousDay(today)) return 'Yesterday'
  const sameYear = key.slice(0, 4) === today.slice(0, 4)
  return new Date(ms).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
    timeZone: tz,
  })
}

// [{ key, label, items }] by calendar day, keeping the server's newest-first order.
export function groupByDay(items = [], now = Date.now(), tz) {
  if (!Array.isArray(items)) return []
  const groups = []
  const byKey = new Map()
  for (const item of items) {
    const ms = toMs(item?.occurredAt)
    const key = Number.isNaN(ms) ? 'unknown' : dayKey(ms, tz)
    if (!byKey.has(key)) {
      const group = { key, label: dayLabel(item?.occurredAt, now, tz), items: [] }
      byKey.set(key, group)
      groups.push(group)
    }
    byKey.get(key).items.push(item)
  }
  return groups
}

// ── Waiting and due labels ──────────────────────────────────────────────────

// How long an item has been stuck. null = the server does not know; never guess.
export function waitingLabel(item) {
  const raw = item?.waitingDays
  if (raw === null || raw === undefined) return 'Waiting time unknown'
  const days = Number(raw)
  if (!Number.isFinite(days)) return 'Waiting time unknown'
  const whole = Math.max(0, Math.floor(days))
  if (item.kind === 'MILESTONE_OVERDUE') {
    return whole === 0 ? 'Due date just passed' : `Overdue by ${plural(whole, 'day')}`
  }
  return whole === 0 ? 'Waiting less than a day' : `Waiting ${plural(whole, 'day')}`
}

// Due dates are plain dates stored at UTC midnight, so format in UTC
// (local time could show the day before).
export function dueLabel(dueDate) {
  if (!dueDate) return null
  const d = new Date(dueDate)
  if (Number.isNaN(d.getTime())) return null
  return `Due ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`
}

// ── Who / what ──────────────────────────────────────────────────────────────

// A null name happens when a CONTRIBUTOR may not see the client's name,
// or when a team member's account was deleted.
export function actorLabel(actor) {
  if (actor?.name) return actor.name
  switch (actor?.type) {
    case 'CLIENT':
      return 'Client'
    case 'INTEGRATION':
      return 'Integration'
    case 'SYSTEM':
      return 'System'
    default:
      return 'A team member'
  }
}

// Small label saying what KIND of thing an event is (null for unknown types).
export function eventCategory(type) {
  if (typeof type !== 'string') return null
  if (type === 'MILESTONE_UPDATE_POSTED') return 'Milestone note'
  if (type === 'DELIVERABLE_UPLOADED') return 'Deliverable'
  if (type === 'PROJECT_UPDATE_POSTED') return 'Update'
  if (type.startsWith('GITHUB_')) return 'GitHub'
  if (type.startsWith('MILESTONE_')) return 'Milestone'
  if (type.startsWith('CLIENT_REQUEST_')) return 'Client request'
  return null
}

// Colour tone for a timeline event. Unknown types fall back to neutral so a
// future event type never renders unstyled.
const SUCCESS = new Set(['MILESTONE_APPROVED', 'MILESTONE_COMPLETED', 'CLIENT_REQUEST_ACCEPTED'])
const WARNING = new Set(['MILESTONE_CHANGES_REQUESTED'])
const ACCENT = new Set([
  'PROJECT_UPDATE_POSTED',
  'GITHUB_PUSH',
  'MILESTONE_SUBMITTED',
  'CLIENT_REQUEST_CREATED',
  'CLIENT_REQUEST_SUBMITTED',
])
export function eventTone(type) {
  if (SUCCESS.has(type)) return 'success'
  if (WARNING.has(type)) return 'warning'
  if (ACCENT.has(type)) return 'accent'
  return 'neutral'
}

// Which small icon a timeline event gets (the panel maps these keys to
// lucide icons). Unknown types fall back to 'update'.
const ICONS = {
  PROJECT_UPDATE_POSTED: 'update',
  GITHUB_PUSH: 'github',
  MILESTONE_CREATED: 'milestone',
  MILESTONE_SUBMITTED: 'milestone',
  MILESTONE_APPROVED: 'done',
  MILESTONE_CHANGES_REQUESTED: 'changes',
  MILESTONE_COMPLETED: 'done',
  MILESTONE_UPDATE_POSTED: 'update',
  DELIVERABLE_UPLOADED: 'file',
  CLIENT_REQUEST_CREATED: 'request',
  CLIENT_REQUEST_SUBMITTED: 'request',
  CLIENT_REQUEST_ACCEPTED: 'done',
  CLIENT_REQUEST_CANCELLED: 'cancelled',
}
export const eventIcon = (type) => ICONS[type] ?? 'update'

// Splits a baked-in title so the thing it is ABOUT can be emphasised:
// “Quoted names”, or whatever follows "Requested from client: ".
// Returns [{ text, strong }].
export function splitTitle(title) {
  const text = String(title ?? '')
  if (text.includes('“')) {
    return text
      .split(/(“[^”]*”)/)
      .filter(Boolean)
      .map((part) => ({ text: part, strong: part.startsWith('“') && part.endsWith('”') }))
  }
  const i = text.indexOf(': ')
  if (i > 0) return [{ text: text.slice(0, i + 2), strong: false }, { text: text.slice(i + 2), strong: true }]
  return [{ text, strong: false }]
}

// Where "Open" should go, from entity.kind.
export function entityTarget(entity) {
  if (entity?.kind === 'clientRequest') return 'requests'
  if (entity?.kind === 'milestone' || entity?.kind === 'milestoneUpdate') return 'milestones'
  return null
}

// ── "New since your last visit" ─────────────────────────────────────────────

// Is this event new for THIS viewer? Never on a first visit (seenBefore null:
// we do not call the whole history new), and never for the viewer's own actions.
export function isNewEvent(event, seenBefore, viewerId) {
  if (!seenBefore) return false
  const seen = toMs(seenBefore)
  const at = toMs(event?.occurredAt)
  if (!Number.isFinite(seen) || !Number.isFinite(at)) return false
  if (viewerId && event?.actor?.type === 'USER' && event.actor.userId === viewerId) return false
  return at > seen
}

// "3 new since your last visit" (or "20+" when older pages may hold more).
export function newSummary(items, seenBefore, viewerId, hasMore = false) {
  if (!Array.isArray(items) || !seenBefore) return null
  const count = items.filter((event) => isNewEvent(event, seenBefore, viewerId)).length
  if (count === 0) return null
  const last = items[items.length - 1]
  const plus = Boolean(hasMore) && toMs(last?.occurredAt) > toMs(seenBefore)
  return `${count}${plus ? '+' : ''} new since your last visit`
}

// ── Attention summary ───────────────────────────────────────────────────────

// One-line version of the summary (kept for callers that want plain text).
export function summaryParts(summary) {
  if (!summary || safeCount(summary.total) === 0) return []
  const parts = []
  const waitingOnClient = safeCount(summary.waitingOnClient)
  const waitingOnTeam = safeCount(summary.waitingOnTeam)
  const blocking = safeCount(summary.blocking)
  const overdue = safeCount(summary.overdue)
  if (waitingOnClient) parts.push(`${waitingOnClient} waiting on client`)
  if (waitingOnTeam) parts.push(`${waitingOnTeam} waiting on team`)
  if (blocking) parts.push(`${blocking} blocking`)
  if (overdue) parts.push(`${overdue} overdue`)
  return parts
}

// The four counters under "Needs attention". `alarm` = a non-zero value
// deserves a warning colour. null when nothing needs attention.
export function summaryStats(summary) {
  if (!summary || safeCount(summary.total) === 0) return null
  return [
    { key: 'waitingOnClient', label: 'Client waiting', value: safeCount(summary.waitingOnClient), alarm: false },
    { key: 'waitingOnTeam', label: 'Team waiting', value: safeCount(summary.waitingOnTeam), alarm: false },
    { key: 'blocking', label: 'Blocking', value: safeCount(summary.blocking), alarm: true },
    { key: 'overdue', label: 'Overdue', value: safeCount(summary.overdue), alarm: true },
  ]
}

// ── Errors and paging ───────────────────────────────────────────────────────

// Turns an HTTP status (+ server message) into what the panel shows.
// 403 = this role may not see the panel at all.
export function describeLoadError(status, message) {
  if (status === 403) {
    return { kind: 'restricted', text: 'Project activity is not available for your role on this project.' }
  }
  if (status === 401) return { kind: 'error', text: 'Your session has expired. Please sign in again.' }
  if (status === 404) return { kind: 'error', text: 'This project could not be found.' }
  if (status === 400 && typeof message === 'string' && message) return { kind: 'error', text: message }
  return { kind: 'error', text: 'Something went wrong. Please try again.' }
}

// Appends the next page, skipping ids already present (also inside the page).
export function mergeById(existing = [], incoming = []) {
  const safeExisting = Array.isArray(existing) ? existing : []
  const safeIncoming = Array.isArray(incoming) ? incoming : []
  const seen = new Set(safeExisting.map((item) => item?.id).filter((id) => id !== null && id !== undefined))
  const merged = [...safeExisting]
  for (const item of safeIncoming) {
    const id = item?.id
    if (id !== null && id !== undefined) {
      if (seen.has(id)) continue
      seen.add(id)
    }
    merged.push(item)
  }
  return merged
}