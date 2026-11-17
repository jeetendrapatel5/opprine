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
