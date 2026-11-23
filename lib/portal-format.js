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

const DAY_MS = 24 * 60 * 60 * 1000
const startOfLocalDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

// Whole calendar days from `now` to `date` (negative when past). Null without a date.
export function daysUntil(date, now = Date.now()) {
  if (!date) return null
  return Math.round((startOfLocalDay(new Date(date)) - startOfLocalDay(new Date(now))) / DAY_MS)
}

// Human due text plus a state the UI maps to a colour: overdue (red), soon (blue), later (neutral).
export function dueLabel(date, now = Date.now()) {
  const days = daysUntil(date, now)
  if (days === null) return null
  if (days < 0) return { text: `${-days} ${-days === 1 ? 'day' : 'days'} overdue`, state: 'overdue', days }
  if (days === 0) return { text: 'Due today', state: 'soon', days }
  if (days === 1) return { text: 'Due tomorrow', state: 'soon', days }
  return { text: `In ${days} days`, state: days <= 3 ? 'soon' : 'later', days }
}

// Counts of events per day for the last `days` days, oldest first. Future dates are ignored.
export function getActivityBuckets(dates = [], { days = 14, now = Date.now() } = {}) {
  const today = startOfLocalDay(new Date(now))
  const counts = Array(days).fill(0)
  for (const date of dates) {
    if (!date) continue
    const age = Math.round((today - startOfLocalDay(new Date(date))) / DAY_MS)
    if (age >= 0 && age < days) counts[days - 1 - age] += 1
  }
  return { counts, total: counts.reduce((a, b) => a + b, 0) }
}

// ── Calendar-day helpers for the update feed ─────────────────────────────────
// They follow the viewer's own time zone, so the server and the browser can
// disagree. Call them on the client only (see `useNow` in UpdateFeed.jsx).

function toValidDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
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
// Dates in the future (a slightly fast clock) count as today.
export function dayLabel(date, now = Date.now()) {
  const value = toValidDate(date)
  if (!value) return ''
  const days = daysUntil(value, now)
  if (days >= 0) return 'Today'
  if (days === -1) return 'Yesterday'
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
      isToday: !pending && value !== null && daysUntil(value, now) >= 0,
      items: [item],
    })
  }
  return groups
}

// Invoice totals per currency (so mixed currencies never add up wrongly) plus counts.
// Cancelled invoices are ignored; "outstanding" is everything not yet paid.
export function summarizeInvoices(invoices = [], now = Date.now()) {
  const totals = {}
  let overdueCount = 0
  let unpaidCount = 0
  for (const inv of invoices) {
    if (inv.status === 'CANCELLED') continue
    const currency = inv.currency ?? 'USD'
    totals[currency] ??= { outstanding: 0, paid: 0 }
    if (inv.status === 'PAID') {
      totals[currency].paid += inv.amount
    } else {
      totals[currency].outstanding += inv.amount
      unpaidCount += 1
      if (inv.dueDate && new Date(inv.dueDate).getTime() < now) overdueCount += 1
    }
  }
  const joined = (key) => {
    const parts = Object.entries(totals)
      .filter(([, t]) => t[key] > 0)
      .map(([currency, t]) => formatCurrency(t[key], currency))
    return parts.length ? parts.join(' + ') : formatCurrency(0, Object.keys(totals)[0])
  }
  return { totals, overdueCount, unpaidCount, outstandingText: joined('outstanding'), paidText: joined('paid') }
}