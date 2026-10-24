// lib/blocked-time.test.js
//
// Run with:  node --test lib/blocked-time.test.js
// Uses Node's built-in test runner, so no extra dependency is needed.

import test from 'node:test'
import assert from 'node:assert/strict'
import { DAY_MS, mergeIntervals, computeBlockedSummary, groupBlockedByMilestone } from './blocked-time.js'

const NOW = new Date('2026-11-10T12:00:00.000Z')
const daysAgo = (n) => new Date(NOW.getTime() - n * DAY_MS)

const req = (overrides = {}) => ({
  blocksWork: true,
  milestoneId: null,
  createdAt: daysAgo(5),
  submittedAt: null,
  cancelledAt: null,
  ...overrides,
})

test('no requests -> nothing blocked', () => {
  const s = computeBlockedSummary([], NOW)
  assert.equal(s.blockedMs, 0)
  assert.equal(s.blockedDays, 0)
  assert.equal(s.openBlockingCount, 0)
  assert.equal(s.oldestOpenSince, null)
})

test('one open blocking request counts up to "now"', () => {
  const s = computeBlockedSummary([req({ createdAt: daysAgo(5) })], NOW)
  assert.equal(s.blockedMs, 5 * DAY_MS)
  assert.equal(s.blockedDays, 5)
  assert.equal(s.openBlockingCount, 1)
  assert.deepEqual(s.oldestOpenSince, daysAgo(5))
})

test('a submitted request stops the clock at submittedAt', () => {
  const s = computeBlockedSummary([req({ createdAt: daysAgo(10), submittedAt: daysAgo(7) })], NOW)
  assert.equal(s.blockedDays, 3)
  assert.equal(s.openBlockingCount, 0)
  assert.equal(s.oldestOpenSince, null)
})

test('a cancelled request stops the clock at cancelledAt', () => {
  const s = computeBlockedSummary([req({ createdAt: daysAgo(10), cancelledAt: daysAgo(8) })], NOW)
  assert.equal(s.blockedDays, 2)
  assert.equal(s.openBlockingCount, 0)
})

test('cancelling AFTER the client answered does not extend the wait', () => {
  const s = computeBlockedSummary(
    [req({ createdAt: daysAgo(10), submittedAt: daysAgo(9), cancelledAt: daysAgo(1) })],
    NOW
  )
  assert.equal(s.blockedDays, 1)
})

test('requests that do not block work are ignored', () => {
  const s = computeBlockedSummary([req({ blocksWork: false, createdAt: daysAgo(30) })], NOW)
  assert.equal(s.blockedMs, 0)
  assert.equal(s.openBlockingCount, 0)
})

test('overlapping waits are counted once, not added together', () => {
  // A: day -10 .. day -4 (6 days)   B: day -7 .. day -2 (5 days)
  // merged: day -10 .. day -2 = 8 days (NOT 11)
  const s = computeBlockedSummary(
    [
      req({ createdAt: daysAgo(10), submittedAt: daysAgo(4) }),
      req({ createdAt: daysAgo(7), submittedAt: daysAgo(2) }),
    ],
    NOW
  )
  assert.equal(s.blockedDays, 8)
})

test('separate waits are added up', () => {
  // A: -10..-8 (2 days)   B: -3..-1 (2 days)  -> 4 days
  const s = computeBlockedSummary(
    [
      req({ createdAt: daysAgo(10), submittedAt: daysAgo(8) }),
      req({ createdAt: daysAgo(3), submittedAt: daysAgo(1) }),
    ],
    NOW
  )
  assert.equal(s.blockedDays, 4)
})

test('three requests open together still count as one wait', () => {
  const s = computeBlockedSummary([req(), req(), req()], NOW)
  assert.equal(s.blockedDays, 5)
  assert.equal(s.openBlockingCount, 3)
})

test('oldestOpenSince is the earliest OPEN blocking request', () => {
  const s = computeBlockedSummary(
    [req({ createdAt: daysAgo(2) }), req({ createdAt: daysAgo(9) }), req({ createdAt: daysAgo(20), submittedAt: daysAgo(15) })],
    NOW
  )
  assert.deepEqual(s.oldestOpenSince, daysAgo(9))
})

test('time in the future is never counted', () => {
  const s = computeBlockedSummary([req({ createdAt: new Date(NOW.getTime() + DAY_MS) })], NOW)
  assert.equal(s.blockedMs, 0)
})

test('bad data (submittedAt before createdAt, invalid date) is dropped, not crashed on', () => {
  const s = computeBlockedSummary(
    [
      req({ createdAt: daysAgo(3), submittedAt: daysAgo(6) }),
      req({ createdAt: 'not a date' }),
    ],
    NOW
  )
  assert.equal(s.blockedMs, 0)
})

test('ISO strings work as well as Date objects', () => {
  const s = computeBlockedSummary([req({ createdAt: daysAgo(2).toISOString() })], NOW)
  assert.equal(s.blockedDays, 2)
})

test('blockedDays rounds down', () => {
  const s = computeBlockedSummary([req({ createdAt: new Date(NOW.getTime() - 2.9 * DAY_MS) })], NOW)
  assert.equal(s.blockedDays, 2)
})

test('mergeIntervals merges touching and nested intervals', () => {
  assert.deepEqual(
    mergeIntervals([[10, 20], [0, 5], [5, 8], [12, 15]]),
    [[0, 8], [10, 20]]
  )
})

test('groupBlockedByMilestone: per-milestone, no-milestone, and project-wide (merged across milestones)', () => {
  const requests = [
    req({ milestoneId: 'm1', createdAt: daysAgo(10), submittedAt: daysAgo(6) }), // 4 days
    req({ milestoneId: 'm2', createdAt: daysAgo(8), submittedAt: daysAgo(4) }), // 4 days, overlaps m1
    req({ milestoneId: null, createdAt: daysAgo(2) }), // 2 days, still open
  ]
  const g = groupBlockedByMilestone(requests, NOW)

  assert.equal(g.milestones.m1.blockedDays, 4)
  assert.equal(g.milestones.m2.blockedDays, 4)
  assert.equal(g.noMilestone.blockedDays, 2)
  assert.equal(g.noMilestone.openBlockingCount, 1)
  // m1 + m2 overlap (day -8..-6), so together they cover day -10..-4 = 6 days; plus 2 = 8
  assert.equal(g.project.blockedDays, 8)
})