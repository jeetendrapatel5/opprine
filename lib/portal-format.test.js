import test from 'node:test'
import assert from 'node:assert/strict'

import {
  timeAgo,
  formatCurrency,
  fileTypeLabel,
  getNextDueMilestone,
  getLastUpdateDate,
} from './portal-format.js'

const NOW = new Date('2026-11-16T12:00:00Z').getTime()
const ago = (ms) => new Date(NOW - ms)
const MIN = 60 * 1000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

test('timeAgo: short and long forms', () => {
  assert.equal(timeAgo(ago(10 * 1000), { now: NOW }), 'just now')
  assert.equal(timeAgo(ago(5 * MIN), { now: NOW }), '5m ago')
  assert.equal(timeAgo(ago(5 * MIN), { now: NOW, long: true }), '5 minutes ago')
  assert.equal(timeAgo(ago(1 * MIN), { now: NOW, long: true }), '1 minute ago')
  assert.equal(timeAgo(ago(3 * HOUR), { now: NOW }), '3h ago')
  assert.equal(timeAgo(ago(1 * HOUR), { now: NOW, long: true }), '1 hour ago')
  assert.equal(timeAgo(ago(1 * DAY), { now: NOW }), 'yesterday')
  assert.equal(timeAgo(ago(4 * DAY), { now: NOW }), '4d ago')
  assert.equal(timeAgo(ago(4 * DAY), { now: NOW, long: true }), '4 days ago')
})

test('timeAgo: empty input gives an empty string', () => {
  assert.equal(timeAgo(null), '')
  assert.equal(timeAgo(undefined), '')
})

test('formatCurrency: defaults to USD', () => {
  assert.equal(formatCurrency(1250, 'USD'), '$1,250.00')
  assert.equal(formatCurrency(99.5), '$99.50')
})

test('fileTypeLabel: friendly labels', () => {
  assert.equal(fileTypeLabel('application/pdf'), 'PDF')
  assert.equal(fileTypeLabel('image/png'), 'PNG')
  assert.equal(fileTypeLabel('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), 'Spreadsheet')
  assert.equal(fileTypeLabel('application/zip'), 'Archive')
  assert.equal(fileTypeLabel(''), '')
  assert.equal(fileTypeLabel(null), '')
})

test('getNextDueMilestone: skips completed and undated milestones', () => {
  const milestones = [
    { id: 'a', status: 'COMPLETED', dueDate: '2026-10-01' },
    { id: 'b', status: 'IN_PROGRESS', dueDate: null },
    { id: 'c', status: 'PENDING', dueDate: '2026-12-01' },
    { id: 'd', status: 'PENDING', dueDate: '2026-12-15' },
  ]
  assert.equal(getNextDueMilestone(milestones).id, 'c')
  assert.equal(getNextDueMilestone([{ status: 'COMPLETED', dueDate: '2026-10-01' }]), null)
  assert.equal(getNextDueMilestone([]), null)
})

test('getLastUpdateDate: newest entry across milestones, without mutating input', () => {
  const milestones = [
    { milestoneUpdates: [{ createdAt: '2026-11-01T10:00:00Z' }, { createdAt: '2026-11-03T10:00:00Z' }] },
    { milestoneUpdates: [{ createdAt: '2026-11-02T10:00:00Z' }] },
    { milestoneUpdates: undefined },
  ]
  const before = JSON.stringify(milestones)
  assert.equal(getLastUpdateDate(milestones).toISOString(), '2026-11-03T10:00:00.000Z')
  assert.equal(JSON.stringify(milestones), before)
  assert.equal(getLastUpdateDate([]), null)
})
