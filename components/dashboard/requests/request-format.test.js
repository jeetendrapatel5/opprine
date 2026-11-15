import test from 'node:test'
import assert from 'node:assert/strict'

// Set before any Date is formatted: a viewer east of UTC is where the old
// UTC-only formatting showed the wrong day.
process.env.TZ = 'Asia/Calcutta'

const {
  DAY_MS,
  formatDate,
  formatDueDate,
  isOverdue,
  daysSince,
  plural,
  formatSize,
  toDateInput,
  todayInputValue,
  friendlyError,
} = await import('./request-format.js')

test('formatDueDate keeps the stored calendar day in any timezone', () => {
  assert.equal(formatDueDate('2026-12-01T00:00:00.000Z'), '1 Dec 2026')
})

test('formatDate shows the viewer\'s own day for real timestamps', () => {
  // 19:30 UTC on the 14th is already the 15th in India.
  assert.equal(formatDate('2026-11-14T19:30:00.000Z'), '15 Nov 2026')
})

test('isOverdue only once the whole due day has passed', () => {
  const due = '2026-12-01T00:00:00.000Z'
  const dueMs = Date.parse(due)
  assert.equal(isOverdue(due, dueMs + DAY_MS - 1), false)
  assert.equal(isOverdue(due, dueMs + DAY_MS), true)
})

test('daysSince counts whole days', () => {
  const start = '2026-11-01T00:00:00.000Z'
  const startMs = Date.parse(start)
  assert.equal(daysSince(start, startMs + 3 * DAY_MS + 5000), 3)
  assert.equal(daysSince(start, startMs + 1000), 0)
})

test('plural', () => {
  assert.equal(plural(1, 'day'), '1 day')
  assert.equal(plural(0, 'day'), '0 days')
  assert.equal(plural(2, 'request'), '2 requests')
})

test('formatSize', () => {
  assert.equal(formatSize(0), '')
  assert.equal(formatSize(512), '512 B')
  assert.equal(formatSize(2048), '2.0 KB')
  assert.equal(formatSize(3 * 1024 * 1024), '3.0 MB')
})

test('toDateInput / todayInputValue', () => {
  assert.equal(toDateInput(null), '')
  assert.equal(toDateInput('2026-12-01T00:00:00.000Z'), '2026-12-01')
  assert.equal(todayInputValue(new Date(2026, 0, 5)), '2026-01-05')
})

test('friendlyError turns server messages into sentences', () => {
  const err = (error) => ({ response: { data: { error } } })
  assert.equal(friendlyError(err('requests.0.title: Title is required.')), 'Request 1: Title is required.')
  assert.equal(friendlyError(err('requests.2.dueDate: Due date cannot be in the past.')), 'Request 3: Due date cannot be in the past.')
  assert.equal(friendlyError(err('dueDate: Due date is too far in the future.')), 'Due date is too far in the future.')
  assert.equal(friendlyError(err('This request is already accepted.')), 'This request is already accepted.')
  assert.equal(friendlyError(undefined), 'Something went wrong. Please try again.')
  assert.equal(friendlyError(err('')), 'Something went wrong. Please try again.')
})
