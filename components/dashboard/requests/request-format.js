// components/dashboard/requests/request-format.js
// Pure helpers shared by the client-request components. No React in here.

export const DAY_MS = 24 * 60 * 60 * 1000

// Keep in sync with REQUEST_LIMITS in lib/client-request-validation.js.
export const LIMITS = Object.freeze({ BATCH_MAX: 20, TITLE_MAX: 200, INSTRUCTIONS_MAX: 2000 })

export const TYPE_LABEL = { TEXT: 'Written answer', APPROVAL: 'Approval', FILE: 'File upload' }

// A due date is a calendar date stored at 00:00 UTC: format it in UTC so
// nobody sees the day before.
export const formatDueDate = (date) =>
  new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })

// Real moments (answered, seen, accepted...) show the viewer's own calendar day.
export const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

// Overdue once the due DATE has fully passed (same rule as the reminder emails).
export const isOverdue = (dueDate, now = Date.now()) => new Date(dueDate).getTime() + DAY_MS <= now

export const daysSince = (date, now = Date.now()) =>
  Math.floor((now - new Date(date).getTime()) / DAY_MS)

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

export function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// "YYYY-MM-DD" for the value of a date input, from a stored due date.
export const toDateInput = (date) => (date ? new Date(date).toISOString().slice(0, 10) : '')

// "YYYY-MM-DD" for today in the viewer's timezone: the `min` of date inputs.
export function todayInputValue(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

// Turns an API error into a sentence for people. The server prefixes
// validation problems with the field path ("requests.0.title: Title is
// required."); show "Request 1: Title is required." instead.
export function friendlyError(err) {
  const message = err?.response?.data?.error
  if (typeof message !== 'string' || !message) return 'Something went wrong. Please try again.'
  const item = message.match(/^requests\.(\d+)\.\w+:\s*(.*)$/)
  if (item) return `Request ${Number(item[1]) + 1}: ${item[2]}`
  return message.replace(/^[\w.]+:\s+/, '')
}
