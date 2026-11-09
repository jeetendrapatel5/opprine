// lib/pulse-format.test.js
import test from 'node:test'
import { readFileSync } from 'node:fs'
import * as pulse from './pulse-format.js'
import assert from 'node:assert/strict'
import {
  eventIcon,
  isNewEvent,
  newSummary,
  timeAgoShort,
  summaryParts,
  splitTitle,
  dayLabel,
  groupByDay,
  timeOfDay,
  waitingLabel,
  dueLabel,
  actorLabel,
  eventTone,
  entityTarget,
  summaryStats,
  eventCategory,
  describeLoadError,
  mergeById,
} from './pulse-format.js'

test('waitingLabel: unknown is never invented', () => {
  assert.equal(waitingLabel({ kind: 'MILESTONE_APPROVAL_PENDING', waitingDays: null }), 'Waiting time unknown')
  assert.equal(waitingLabel({ kind: 'CLIENT_RESPONSE_PENDING', waitingDays: 0 }), 'Waiting less than a day')
  assert.equal(waitingLabel({ kind: 'CLIENT_RESPONSE_PENDING', waitingDays: 1 }), 'Waiting 1 day')
  assert.equal(waitingLabel({ kind: 'CLIENT_RESPONSE_PENDING', waitingDays: 4 }), 'Waiting 4 days')
})

test('waitingLabel: overdue milestone reads as overdue', () => {
  assert.equal(waitingLabel({ kind: 'MILESTONE_OVERDUE', waitingDays: 0 }), 'Due date just passed')
  assert.equal(waitingLabel({ kind: 'MILESTONE_OVERDUE', waitingDays: 3 }), 'Overdue by 3 days')
})

test('dueLabel: formats in UTC, handles missing/bad', () => {
  assert.equal(dueLabel('2026-11-12T00:00:00.000Z'), 'Due 12 Nov')
  assert.equal(dueLabel(null), null)
  assert.equal(dueLabel('x'), null)
})

test('actorLabel: names and fallbacks (CONTRIBUTOR gets null client name)', () => {
  assert.equal(actorLabel({ type: 'USER', name: 'Asha' }), 'Asha')
  assert.equal(actorLabel({ type: 'CLIENT', name: null }), 'Client')
  assert.equal(actorLabel({ type: 'USER', name: null }), 'A team member')
  assert.equal(actorLabel({ type: 'INTEGRATION', name: null }), 'Integration')
  assert.equal(actorLabel(undefined), 'A team member')
})

test('eventTone: known and unknown types', () => {
  assert.equal(eventTone('MILESTONE_APPROVED'), 'success')
  assert.equal(eventTone('MILESTONE_CHANGES_REQUESTED'), 'warning')
  assert.equal(eventTone('GITHUB_PUSH'), 'accent')
  assert.equal(eventTone('CLIENT_REQUEST_CANCELLED'), 'neutral')
  assert.equal(eventTone('SOMETHING_NEW'), 'neutral')
})

test('entityTarget', () => {
  assert.equal(entityTarget({ kind: 'clientRequest', id: 'a' }), 'requests')
  assert.equal(entityTarget({ kind: 'milestone', id: 'a' }), 'milestones')
  assert.equal(entityTarget({ kind: 'milestoneUpdate', id: 'a' }), 'milestones')
  assert.equal(entityTarget({ kind: 'update', id: 'a' }), null)
  assert.equal(entityTarget(null), null)
})

test('summaryStats: null when empty, four stats otherwise', () => {
  assert.equal(summaryStats({ total: 0 }), null)
  assert.equal(summaryStats(null), null)
  const stats = summaryStats({ total: 4, waitingOnClient: 3, waitingOnTeam: 1, blocking: 0, overdue: 2 })
  assert.deepEqual(stats.map((s) => [s.key, s.value, s.alarm]), [
    ['waitingOnClient', 3, false],
    ['waitingOnTeam', 1, false],
    ['blocking', 0, true],
    ['overdue', 2, true],
  ])
})

test('eventCategory', () => {
  assert.equal(eventCategory('CLIENT_REQUEST_CANCELLED'), 'Client request')
  assert.equal(eventCategory('MILESTONE_APPROVED'), 'Milestone')
  assert.equal(eventCategory('MILESTONE_UPDATE_POSTED'), 'Milestone note')
  assert.equal(eventCategory('DELIVERABLE_UPLOADED'), 'Deliverable')
  assert.equal(eventCategory('PROJECT_UPDATE_POSTED'), 'Update')
  assert.equal(eventCategory('GITHUB_PUSH'), 'GitHub')
  assert.equal(eventCategory('NEW_THING'), null)
  assert.equal(eventCategory(undefined), null)
})

test('timeOfDay / dayLabel / groupByDay (UTC)', () => {
  const now = Date.parse('2026-11-07T10:00:00Z')
  assert.equal(timeOfDay('2026-11-07T19:42:00Z', 'UTC'), '7:42 PM')
  assert.equal(timeOfDay('bad', 'UTC'), null)
  assert.equal(dayLabel('2026-11-07T01:00:00Z', now, 'UTC'), 'Today')
  assert.equal(dayLabel('2026-11-06T23:59:00Z', now, 'UTC'), 'Yesterday')
  assert.match(dayLabel('2026-11-03T12:00:00Z', now, 'UTC'), /Tue,? 3 Nov$/)
  assert.match(dayLabel('2025-12-25T12:00:00Z', now, 'UTC'), /2025$/)
  assert.equal(dayLabel('bad', now, 'UTC'), 'Earlier')
  const groups = groupByDay(
    [
      { id: 'a', occurredAt: '2026-11-07T09:00:00Z' },
      { id: 'b', occurredAt: '2026-11-07T08:00:00Z' },
      { id: 'c', occurredAt: '2026-11-06T20:00:00Z' },
    ],
    now,
    'UTC',
  )
  assert.deepEqual(groups.map((g) => [g.label, g.items.map((i) => i.id)]), [
    ['Today', ['a', 'b']],
    ['Yesterday', ['c']],
  ])
})

test('describeLoadError: 403 is restricted, others are errors', () => {
  assert.equal(describeLoadError(403, 'x').kind, 'restricted')
  assert.equal(describeLoadError(401).kind, 'error')
  assert.match(describeLoadError(404).text, /not be found/)
  assert.equal(describeLoadError(400, 'Invalid cursor.').text, 'Invalid cursor.')
  assert.match(describeLoadError(500, 'Something went wrong').text, /try again/)
  assert.match(describeLoadError(undefined).text, /try again/)
})

test('mergeById: appends only new ids, keeps order', () => {
  const a = [{ id: '1' }, { id: '2' }]
  const b = [{ id: '2' }, { id: '3' }]
  assert.deepEqual(mergeById(a, b).map((x) => x.id), ['1', '2', '3'])
})

test('eventIcon: one icon per kind, unknown falls back', () => {
  assert.equal(eventIcon('GITHUB_PUSH'), 'github')
  assert.equal(eventIcon('CLIENT_REQUEST_CANCELLED'), 'cancelled')
  assert.equal(eventIcon('MILESTONE_APPROVED'), 'done')
  assert.equal(eventIcon('NEW_THING'), 'update')
})

test('splitTitle: emphasises the quoted name or the part after the colon', () => {
  assert.deepEqual(splitTitle('Response to “files” accepted'), [
    { text: 'Response to ', strong: false },
    { text: '“files”', strong: true },
    { text: ' accepted', strong: false },
  ])
  assert.deepEqual(splitTitle('Requested from client: logo'), [
    { text: 'Requested from client: ', strong: false },
    { text: 'logo', strong: true },
  ])
  assert.deepEqual(splitTitle('Project update posted'), [{ text: 'Project update posted', strong: false }])
  assert.deepEqual(splitTitle(null), [{ text: '', strong: false }])
})

test('dayLabel + groupByDay (viewer-local zone): Today / Yesterday / date, order kept', () => {
  const now = new Date(2026, 10, 8, 15, 0) // 8 Nov 2026, local
  const at = (d, h) => new Date(2026, 10, d, h, 30).toISOString()
  assert.equal(dayLabel(at(8, 9), now), 'Today')
  assert.equal(dayLabel(at(7, 23), now), 'Yesterday')
  assert.match(dayLabel(at(3, 9), now), /^Tue,? 3 Nov$/)
  assert.match(dayLabel(new Date(2025, 11, 30).toISOString(), now), /2025/)
  assert.equal(dayLabel('garbage', now), 'Earlier')
  const items = [
    { id: 'a', occurredAt: at(8, 14) },
    { id: 'b', occurredAt: at(8, 9) },
    { id: 'c', occurredAt: at(7, 20) },
    { id: 'd', occurredAt: at(3, 10) },
  ]
  const groups = groupByDay(items, now)
  assert.deepEqual(groups.map((g) => [g.label, g.items.map((i) => i.id)]), [
    ['Today', ['a', 'b']],
    ['Yesterday', ['c']],
    [dayLabel(at(3, 10), now), ['d']],
  ])
})

test('timeOfDay (viewer-local zone): formats, tolerates bad input', () => {
  assert.match(timeOfDay(new Date(2026, 10, 8, 19, 5).toISOString()), /^7:05\s?PM$/)
  assert.equal(timeOfDay('x'), null)
})

// Guard against the "X is not a function" crash: every helper the panel
// imports from pulse-format.js must really be exported.
test('the panel only imports helpers that pulse-format.js exports', () => {
  const src = readFileSync(new URL('../components/project/RecentActivityPanel.jsx', import.meta.url), 'utf8')
  const block = src.match(/import \{([^}]*)\} from '@\/lib\/pulse-format\.js'/)
  assert.ok(block, 'panel import from pulse-format.js not found')
  const names = block[1].split(',').map((n) => n.trim()).filter(Boolean)
  assert.ok(names.length > 5)
  for (const name of names) assert.equal(typeof pulse[name], 'function', `${name} is not exported`)
})

test('timeAgoShort: buckets and bad input', () => {
  const now = Date.parse('2026-11-07T10:00:00Z')
  const ago = (ms) => new Date(now - ms).toISOString()
  assert.equal(timeAgoShort(ago(10_000), now), 'Just now')
  assert.equal(timeAgoShort(ago(5 * 60_000), now), '5m ago')
  assert.equal(timeAgoShort(ago(3 * 3_600_000), now), '3h ago')
  assert.equal(timeAgoShort(ago(2 * 86_400_000), now), '2d ago')
  assert.equal(timeAgoShort(null, now), null)
  assert.equal(timeAgoShort('nonsense', now), null)
})

test('summaryParts + bad numbers never crash', () => {
  assert.deepEqual(summaryParts({ total: 0 }), [])
  assert.deepEqual(summaryParts({ total: 3, waitingOnClient: '2', blocking: 1, overdue: 'x' }), ['2 waiting on client', '1 blocking'])
  assert.equal(summaryStats({ total: 1, overdue: -4 })[3].value, 0)
  assert.equal(waitingLabel({ kind: 'X', waitingDays: 'abc' }), 'Waiting time unknown')
  assert.deepEqual(mergeById(undefined, [{ id: 1 }, { id: 1 }]).map((x) => x.id), [1])
})

test('isNewEvent: newer than last visit, not on a first visit, not your own', () => {
  const seenAt = '2026-11-07T10:00:00.000Z'
  const ev = (iso, actor = { type: 'CLIENT', userId: null, name: 'C' }) => ({ occurredAt: iso, actor })
  assert.equal(isNewEvent(ev('2026-11-07T10:00:01.000Z'), seenAt, 'me'), true)
  assert.equal(isNewEvent(ev('2026-11-07T10:00:00.000Z'), seenAt, 'me'), false, 'same instant is not new')
  assert.equal(isNewEvent(ev('2026-11-07T09:00:00.000Z'), seenAt, 'me'), false)
  assert.equal(isNewEvent(ev('2026-11-08T09:00:00.000Z'), null, 'me'), false, 'first visit: nothing is new')
  assert.equal(isNewEvent(ev('2026-11-08T09:00:00.000Z', { type: 'USER', userId: 'me' }), seenAt, 'me'), false, 'own action')
  assert.equal(isNewEvent(ev('2026-11-08T09:00:00.000Z', { type: 'USER', userId: 'other' }), seenAt, 'me'), true)
  assert.equal(isNewEvent(ev('garbage'), seenAt, 'me'), false)
  assert.equal(isNewEvent(null, seenAt, 'me'), false)
})

test('newSummary: counts, adds + when older pages may hold more, null when none', () => {
  const seenAt = '2026-11-07T10:00:00.000Z'
  const items = [
    { occurredAt: '2026-11-08T10:00:00.000Z', actor: { type: 'CLIENT' } },
    { occurredAt: '2026-11-08T09:00:00.000Z', actor: { type: 'USER', userId: 'me' } },
    { occurredAt: '2026-11-07T11:00:00.000Z', actor: { type: 'CLIENT' } },
  ]
  assert.equal(newSummary(items, seenAt, 'me', false), '2 new since your last visit')
  assert.equal(newSummary(items, seenAt, 'me', true), '2+ new since your last visit', 'oldest loaded is still new')
  assert.equal(newSummary(items.slice(0, 1), seenAt, 'me', true), '1+ new since your last visit')
  assert.equal(newSummary([{ occurredAt: '2026-11-07T09:00:00.000Z', actor: {} }], seenAt, 'me', true), null)
  assert.equal(newSummary(items, null, 'me'), null)
  assert.equal(newSummary(undefined, seenAt, 'me'), null)
})