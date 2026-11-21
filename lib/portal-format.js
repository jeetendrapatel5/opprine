// lib/portal-format.js
// Pure display helpers for the client portal. No React, no I/O.
// Date, size and plural helpers live in request-format.js and are reused as is.

// "5m ago" by default; `long` gives "5 minutes ago" for feeds with room to spare.
export function timeAgo(date, { long = false, now = Date.now() } = {}) {
  if (!date) return ''
  const seconds = Math.floor((now - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return long ? `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago` : `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return long ? `${hours} ${hours === 1 ? 'hour' : 'hours'} ago` : `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  return long ? `${days} days ago` : `${days}d ago`
}

// ── Calendar-day helpers (used by the update feed) ───────────────────────────
// These follow the viewer's own time zone, so the server and the browser can
// disagree. Call them on the client only (see `useNow` in UpdateFeed.jsx).

const DAY_MS = 86_400_000

function toValidDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfDay(time) {
  const date = new Date(time)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

// Whole calendar days between `date` and `now` (0 = today, 1 = yesterday).
// Math.round absorbs the 23h/25h days around daylight-saving changes.
function daysAgo(date, now) {
  return Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS)
}

// "2:41 PM" (or "14:41", following the viewer's locale).
export function formatClock(date) {
  const value = toValidDate(date)
  if (!value) return ''
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(value)
}

// "Mon, 17 Nov 2026, 2:41 PM" for tooltips.
export function formatDateTime(date) {
  const value = toValidDate(date)
  if (!value) return ''
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(value)
}

// "Today", "Yesterday", "Mon, 17 Nov" (the year is added only for other years).
export function dayLabel(date, now = Date.now()) {
  const value = toValidDate(date)
  if (!value) return ''
  const diff = daysAgo(value, now)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  const sameYear = value.getFullYear() === new Date(now).getFullYear()
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(value)
}

function dayKey(date, utc) {
  const value = toValidDate(date)
  if (!value) return 'unknown'
  return utc
    ? value.toISOString().slice(0, 10)
    : `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`
}

// Splits a newest-first list into runs that share a calendar day:
//   [{ key, label, isToday, items }]
// `now: null` means "we are on the server or still hydrating". The grouping
// then uses UTC days (the same on server and browser) and leaves the labels
// empty, so both sides render identical markup. Pass a real `now` afterwards.
export function groupByDay(items, { now = null } = {}) {
  const pending = now === null
  const groups = []
  for (const item of items) {
    const key = dayKey(item.createdAt, pending)
    const last = groups[groups.length - 1]
    if (last && last.key === key) {
      last.items.push(item)
      continue
    }
    const value = toValidDate(item.createdAt)
    groups.push({
      key,
      label: pending ? '' : dayLabel(item.createdAt, now),
      isToday: !pending && value !== null && daysAgo(value, now) <= 0,
      items: [item],
    })
  }
  return groups
}

export function formatCurrency(amount, currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency ?? 'USD',
  }).format(amount)
}

// "image/png" -> "PNG", "application/vnd...sheet" -> "XLSX"-ish short label.
export function fileTypeLabel(mime) {
  const type = (mime || '').toLowerCase()
  if (!type) return ''
  if (type === 'application/pdf') return 'PDF'
  if (type.includes('spreadsheet') || type.includes('excel')) return 'Spreadsheet'
  if (type.includes('word') || type.includes('document')) return 'Document'
  if (type.includes('presentation') || type.includes('powerpoint')) return 'Slides'
  if (type.includes('zip') || type.includes('compressed')) return 'Archive'
  const subtype = type.split('/')[1]
  return subtype ? subtype.replace(/^x-/, '').toUpperCase() : ''
}

// Earliest not-yet-completed milestone that has a due date, or null.
// Milestones arrive sorted by `order`, so the first match is the next one due.
export function getNextDueMilestone(milestones = []) {
  return milestones.find((m) => m.status !== 'COMPLETED' && m.dueDate) ?? null
}

// Newest work-log timestamp across all milestones, or null.
export function getLastUpdateDate(milestones = []) {
  let latest = null
  for (const milestone of milestones) {
    for (const update of milestone.milestoneUpdates ?? []) {
      const time = new Date(update.createdAt).getTime()
      if (latest === null || time > latest) latest = time
    }
  }
  return latest === null ? null : new Date(latest)
}

// Project-level status labels shared by the overview and the sidebar.
export const PROJECT_STATUS = {
  ON_TRACK:        { label: 'On track',             tone: 'success' },
  AWAITING_REVIEW: { label: 'Awaiting your review', tone: 'accent' },
  COMPLETED:       { label: 'Project complete',     tone: 'success' },
}