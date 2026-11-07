// lib/project-attention.test.js
//
// Run with:  node --test lib/project-attention.test.js
//
// Two groups:
//   1. The PURE rule engine (buildAttentionItems): every rule, boundary and the
//      ordering, with no database and a fixed clock.
//   2. The service around it (roles, which queries run, caps), using a small
//      fake database.
// What a fake cannot prove (index use on real Postgres, real multi-user
// behaviour) is checked by the separate end-to-end run.

import test from 'node:test'
import assert from 'node:assert/strict'

// lib/prisma.js and lib/email.js read these when imported; nothing connects.
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test'
process.env.RESEND_API_KEY ??= 're_dummy_key_for_tests'
const { buildAttentionItems, getAttentionForRole, getProjectAttention, isPastDue, MAX_ITEMS, ATTENTION_KINDS } =
  await import('./project-attention.js')
const { clientRequestsEmail } = await import('./emailTemplates.js')
const { computeBlockedSummary } = await import('./blocked-time.js')

const NOW = new Date('2026-11-06T12:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000
const daysAgo = (n) => new Date(NOW.getTime() - n * DAY)
const PROJECT = 'proj_1'

const req = (overrides = {}) => ({
  id: 'req_1',
  title: 'Brand assets',
  status: 'OPEN',
  blocksWork: true,
  dueDate: null,
  createdAt: daysAgo(5),
  submittedAt: null,
  milestoneId: null,
  ...overrides,
})
const ms = (overrides = {}) => ({ id: 'ms_1', title: 'Homepage', status: 'IN_PROGRESS', dueDate: null, ...overrides })
const build = (input) => buildAttentionItems({ now: NOW, ...input })
const only = (input) => {
  const { items } = build(input)
  assert.equal(items.length, 1, `expected exactly one item, got ${items.length}`)
  return items[0]
}

// ── Client requests the client has not answered ────────────────────────────

test('an OPEN blocking request: the client must act, it blocks work, and it is HIGH priority', () => {
  const item = only({ requests: [req({ createdAt: daysAgo(5) })] })
  assert.equal(item.kind, 'CLIENT_RESPONSE_PENDING')
  assert.equal(item.nextActionBy, 'CLIENT')
  assert.equal(item.blocking, true)
  assert.equal(item.overdue, false)
  assert.equal(item.priority, 'HIGH')
  assert.equal(item.waitingDays, 5)
  assert.equal(item.since, daysAgo(5).toISOString())
  assert.equal(item.title, 'Waiting for the client: Brand assets')
  assert.deepEqual(item.entity, { kind: 'clientRequest', id: 'req_1' })
})

test('an ordinary OPEN request that does not block work is NOT a blocker (and is not high priority)', () => {
  const item = only({ requests: [req({ blocksWork: false })] })
  assert.equal(item.blocking, false)
  assert.equal(item.priority, 'NORMAL')
  assert.equal(item.nextActionBy, 'CLIENT')
})

test('"overdue" starts only once the whole due DATE has passed', () => {
  const due = new Date('2026-11-05T00:00:00.000Z')
  assert.equal(isPastDue(due, new Date('2026-11-05T23:59:59.999Z')), false, 'still due today')
  assert.equal(isPastDue(due, new Date('2026-11-06T00:00:00.000Z')), true, 'the next day')
  assert.equal(isPastDue(null, NOW), false)
  assert.equal(isPastDue(undefined, NOW), false)
  assert.equal(isPastDue('not a date', NOW), false)
  assert.equal(isPastDue(due.toISOString(), NOW), true, 'ISO strings work too')
})

test('the overdue rule agrees with the reminder emails (same renderer, same boundary)', () => {
  const dueDate = new Date('2026-11-05T00:00:00.000Z')
  for (const instant of ['2026-11-04T12:00:00Z', '2026-11-05T00:00:00Z', '2026-11-05T23:59:59Z', '2026-11-06T00:00:00Z', '2026-11-09T00:00:00Z']) {
    const now = new Date(instant)
    const { html } = clientRequestsEmail({ clientName: 'C', freelancerName: 'F', projectName: 'P', requests: [{ title: 'X', dueDate }], portalUrl: 'https://p.test', now })
    assert.equal(html.includes('was due'), isPastDue(dueDate, now), instant)
  }
})

test('an overdue blocking request is HIGH and overdue; an overdue NON-blocking one is HIGH but not blocking', () => {
  const blocking = only({ requests: [req({ dueDate: daysAgo(3) })] })
  assert.equal(blocking.overdue, true)
  assert.equal(blocking.blocking, true)
  assert.equal(blocking.priority, 'HIGH')

  const soft = only({ requests: [req({ blocksWork: false, dueDate: daysAgo(3) })] })
  assert.equal(soft.overdue, true)
  assert.equal(soft.blocking, false)
  assert.equal(soft.priority, 'HIGH')
})

test('a request with a future due date is not overdue', () => {
  const item = only({ requests: [req({ dueDate: new Date(NOW.getTime() + 3 * DAY) })] })
  assert.equal(item.overdue, false)
  assert.equal(item.dueDate, new Date(NOW.getTime() + 3 * DAY).toISOString())
})

// ── Responses waiting for the team ─────────────────────────────────────────

test('a SUBMITTED response waits on the TEAM, never blocks, and is never "overdue"', () => {
  const item = only({ requests: [req({ status: 'SUBMITTED', blocksWork: true, dueDate: daysAgo(10), submittedAt: daysAgo(2) })] })
  assert.equal(item.kind, 'CLIENT_RESPONSE_NEEDS_REVIEW')
  assert.equal(item.nextActionBy, 'TEAM')
  assert.equal(item.blocking, false)
  assert.equal(item.overdue, false, 'the client already did their part')
  assert.equal(item.priority, 'NORMAL')
  assert.equal(item.waitingDays, 2)
  assert.equal(item.since, daysAgo(2).toISOString())
  assert.equal(item.title, "Review the client's response: Brand assets")
})

test('accepted and cancelled requests produce nothing', () => {
  const out = build({ requests: [req({ id: 'a', status: 'ACCEPTED' }), req({ id: 'c', status: 'CANCELLED' })] })
  assert.deepEqual(out.items, [])
  assert.equal(out.summary.total, 0)
})

// ── Milestones ─────────────────────────────────────────────────────────────

test('a milestone IN_REVIEW waits on the CLIENT and is not called a blocker', () => {
  const item = only({ milestones: [ms({ status: 'IN_REVIEW' })], submittedAtById: new Map([['ms_1', daysAgo(4)]]) })
  assert.equal(item.kind, 'MILESTONE_APPROVAL_PENDING')
  assert.equal(item.nextActionBy, 'CLIENT')
  assert.equal(item.blocking, false)
  assert.equal(item.overdue, false)
  assert.equal(item.priority, 'NORMAL')
  assert.equal(item.waitingDays, 4)
  assert.deepEqual(item.entity, { kind: 'milestone', id: 'ms_1' })
})

test('when we do not know when it was submitted, we say so instead of guessing', () => {
  const item = only({ milestones: [ms({ status: 'IN_REVIEW' })] })
  assert.equal(item.since, null)
  assert.equal(item.waitingDays, null)
})

test('an IN_REVIEW milestone that is also late is ONE item (overdue is a flag, not a second item)', () => {
  const item = only({ milestones: [ms({ status: 'IN_REVIEW', dueDate: daysAgo(2) })], submittedAtById: new Map([['ms_1', daysAgo(1)]]) })
  assert.equal(item.kind, 'MILESTONE_APPROVAL_PENDING')
  assert.equal(item.overdue, true)
  assert.equal(item.priority, 'HIGH')
})

test('a PENDING or IN_PROGRESS milestone past its due date is late work for the TEAM', () => {
  for (const status of ['PENDING', 'IN_PROGRESS']) {
    const item = only({ milestones: [ms({ status, dueDate: new Date('2026-11-03T00:00:00.000Z') })] })
    assert.equal(item.kind, 'MILESTONE_OVERDUE', status)
    assert.equal(item.nextActionBy, 'TEAM')
    assert.equal(item.blocking, false)
    assert.equal(item.overdue, true)
    assert.equal(item.priority, 'HIGH')
    // late since the due DATE fully passed (Nov 4 00:00), and it is Nov 6 12:00
    assert.equal(item.since, '2026-11-04T00:00:00.000Z')
    assert.equal(item.waitingDays, 2)
  }
})

test('milestones that are on time, undated or completed produce nothing', () => {
  const out = build({
    milestones: [
      ms({ id: 'a', status: 'IN_PROGRESS', dueDate: new Date(NOW.getTime() + DAY) }),
      ms({ id: 'b', status: 'PENDING', dueDate: null }),
      ms({ id: 'c', status: 'COMPLETED', dueDate: daysAgo(30) }),
      ms({ id: 'd', status: 'IN_PROGRESS', dueDate: new Date('2026-11-06T00:00:00.000Z') }), // due today
    ],
  })
  assert.deepEqual(out.items, [])
})

// ── Ordering ───────────────────────────────────────────────────────────────

const mixed = () => ({
  requests: [
    req({ id: 'open-soft', blocksWork: false, createdAt: daysAgo(20) }), //            NORMAL
    req({ id: 'open-blocking-late-10d', dueDate: daysAgo(2), createdAt: daysAgo(10) }), // HIGH overdue blocking
    req({ id: 'open-blocking-late-3d', dueDate: daysAgo(2), createdAt: daysAgo(3) }), //   HIGH overdue blocking
    req({ id: 'open-soft-late', blocksWork: false, dueDate: daysAgo(2), createdAt: daysAgo(12) }), // HIGH overdue, not blocking, waiting 12d
    req({ id: 'open-blocking', createdAt: daysAgo(6) }), //                              HIGH blocking, not overdue
    req({ id: 'review', status: 'SUBMITTED', submittedAt: daysAgo(7) }), //             NORMAL
  ],
  milestones: [
    ms({ id: 'ms-late', status: 'IN_PROGRESS', dueDate: daysAgo(9) }), //               HIGH overdue, not blocking
    ms({ id: 'ms-review', status: 'IN_REVIEW' }), //                                     NORMAL
  ],
  submittedAtById: new Map([['ms-review', daysAgo(1)]]),
})

test('most urgent first: late, then blocking, then longest waiting', () => {
  const ids = build(mixed()).items.map((i) => i.id)
  assert.deepEqual(ids, [
    'clientRequest:open-blocking-late-10d', // overdue + blocking, waiting longest
    'clientRequest:open-blocking-late-3d', //  overdue + blocking
    'clientRequest:open-soft-late', //         overdue, not blocking, waiting 12d
    'milestone:ms-late', //                    overdue, not blocking, late for 8d (due 9d ago, late a day after)
    'clientRequest:open-blocking', //          blocking, not overdue (still HIGH)
    'clientRequest:open-soft', //              NORMAL, waiting 20d
    'clientRequest:review', //                 NORMAL, waiting 7d
    'milestone:ms-review', //                  NORMAL, waiting 1d
  ])
})

test('the same data in ANY input order gives the same list', () => {
  const base = mixed()
  const expected = JSON.stringify(build(base).items)
  const shuffled = {
    requests: [...base.requests].reverse(),
    milestones: [...base.milestones].reverse(),
    submittedAtById: base.submittedAtById,
  }
  assert.equal(JSON.stringify(build(shuffled).items), expected)
})

test('items that tie on every rule are ordered by id, whatever order they arrive in', () => {
  // Same priority, same overdue, same blocking, same waiting time: only the id can decide.
  const twins = ['b', 'c', 'a'].map((id) => req({ id, createdAt: daysAgo(4) }))
  const forward = build({ requests: twins }).items.map((i) => i.id)
  const backward = build({ requests: [...twins].reverse() }).items.map((i) => i.id)
  assert.deepEqual(forward, ['clientRequest:a', 'clientRequest:b', 'clientRequest:c'])
  assert.deepEqual(backward, forward)
})

// ── Summary ────────────────────────────────────────────────────────────────

test('the summary counts add up and reuse the blocked-time definition of "open blocking"', () => {
  const input = mixed()
  const { items, summary } = build(input)
  assert.equal(summary.total, 8)
  assert.equal(summary.high, items.filter((i) => i.priority === 'HIGH').length)
  assert.equal(summary.overdue, 4)
  assert.equal(summary.waitingOnClient + summary.waitingOnTeam, summary.total)
  assert.equal(summary.waitingOnTeam, 2 /* ms-late, review */)

  const open = input.requests.filter((r) => r.status === 'OPEN')
  const reference = computeBlockedSummary(open, NOW)
  assert.equal(summary.blocking, reference.openBlockingCount)
  assert.equal(summary.blocking, 3)
  assert.equal(summary.oldestBlockingSince, reference.oldestOpenSince.toISOString())
  assert.equal(summary.blocking, items.filter((i) => i.kind === 'CLIENT_RESPONSE_PENDING' && i.blocking).length)
})

test('an empty project has an empty, well-formed result', () => {
  const out = build({})
  assert.deepEqual(out.items, [])
  assert.deepEqual(out.summary, { total: 0, high: 0, blocking: 0, overdue: 0, waitingOnClient: 0, waitingOnTeam: 0, oldestBlockingSince: null })
})

test(`at most ${MAX_ITEMS} items are returned, but the summary still counts them all`, () => {
  const requests = Array.from({ length: 60 }, (_, i) => req({ id: `r${String(i).padStart(2, '0')}`, createdAt: daysAgo(i + 1) }))
  const out = build({ requests })
  assert.equal(out.items.length, MAX_ITEMS)
  assert.equal(out.summary.total, 60)
})

// ── Output hygiene ─────────────────────────────────────────────────────────

test('items have a fixed shape and never carry private text', () => {
  const dirty = req({ instructions: 'SECRET INSTRUCTIONS', answerText: 'SECRET ANSWER', fileUrl: 'https://x/secret.pdf', fileName: 'secret.pdf', clientEmail: 'c@x.test' })
  const { items } = build({ requests: [dirty], milestones: [ms({ status: 'IN_REVIEW', rejectionNote: 'SECRET NOTE', deliverySummary: 'SECRET SUMMARY' })] })
  for (const entry of items) {
    assert.deepEqual(Object.keys(entry).sort(), ['blocking', 'dueDate', 'entity', 'id', 'kind', 'milestoneId', 'nextActionBy', 'overdue', 'priority', 'since', 'title', 'waitingDays'])
    assert.ok(ATTENTION_KINDS.includes(entry.kind))
  }
  assert.ok(!JSON.stringify(items).includes('SECRET'))
})

test('very long titles are clipped', () => {
  const { items } = build({ requests: [req({ title: 'word '.repeat(200) })] })
  assert.ok(items[0].title.length <= 200)
  assert.ok(items[0].title.endsWith('…'))
})

test('the rule engine refuses to run without a clock', () => {
  assert.throws(() => buildAttentionItems({ requests: [], milestones: [] }), /needs `now`/)
})

// ── The service: roles, queries, caps ──────────────────────────────────────

function makeDb({ requests = [], milestones = [], events = [], workspaceRole = 'OWNER', projectRole = null } = {}) {
  const calls = { project: 0, requests: [], milestones: [], events: [] }
  const inList = (list) => (v) => list.includes(v)
  return {
    calls,
    project: {
      findUnique: async () => {
        calls.project++
        return {
          members: projectRole ? [{ role: projectRole }] : [],
          workspace: { members: workspaceRole ? [{ role: workspaceRole }] : [] },
        }
      },
    },
    clientRequest: {
      findMany: async (args) => {
        calls.requests.push(args)
        return requests.filter((r) => r.projectId === args.where.projectId && inList(args.where.status.in)(r.status)).slice(0, args.take)
      },
    },
    milestone: {
      findMany: async (args) => {
        calls.milestones.push(args)
        return milestones.filter((m) => m.projectId === args.where.projectId && m.status !== args.where.status.not).slice(0, args.take)
      },
    },
    projectActivity: {
      findMany: async (args) => {
        calls.events.push(args)
        const { projectId, type, entityId } = args.where
        return events
          .filter((e) => e.projectId === projectId && e.type === type && entityId.in.includes(e.entityId))
          .sort((a, b) => b.occurredAt - a.occurredAt)
      },
    },
  }
}
const inProject = (rows, projectId = PROJECT) => rows.map((r) => ({ projectId, ...r }))
const attention = (db, role = 'OWNER') => getAttentionForRole({ projectId: PROJECT, role, now: NOW }, db)

test('the service reads only this project, with bounded queries', async () => {
  const db = makeDb({
    requests: [...inProject([req({ id: 'mine' })]), ...inProject([req({ id: 'theirs', title: 'OTHER PROJECT SECRET' })], 'proj_other')],
    milestones: [...inProject([ms({ id: 'm_mine', dueDate: daysAgo(3) })]), ...inProject([ms({ id: 'm_theirs', title: 'OTHER MILESTONE', dueDate: daysAgo(3) })], 'proj_other')],
  })
  const out = await attention(db)
  assert.ok(!JSON.stringify(out).includes('OTHER'))
  assert.equal(out.items.length, 2)
  assert.equal(db.calls.requests[0].where.projectId, PROJECT)
  assert.deepEqual(db.calls.requests[0].where.status.in.sort(), ['OPEN', 'SUBMITTED'], 'finished requests are never read')
  assert.equal(db.calls.requests[0].take, 200)
  assert.equal(db.calls.milestones[0].where.projectId, PROJECT)
  assert.equal(db.calls.milestones[0].take, 100)
})

test('the timeline is only queried when a milestone is actually in review', async () => {
  const quiet = makeDb({ milestones: inProject([ms({ status: 'IN_PROGRESS' })]) })
  await attention(quiet)
  assert.equal(quiet.calls.events.length, 0)

  const busy = makeDb({ milestones: inProject([ms({ id: 'm1', status: 'IN_REVIEW' }), ms({ id: 'm2', status: 'IN_REVIEW' })]) })
  await attention(busy)
  assert.equal(busy.calls.events.length, 1, 'one query covers every milestone in review')
  assert.equal(busy.calls.events[0].where.projectId, PROJECT)
  assert.equal(busy.calls.events[0].where.type, 'MILESTONE_SUBMITTED')
  assert.deepEqual(busy.calls.events[0].where.entityId.in.sort(), ['m1', 'm2'])
})

test('the NEWEST submission decides how long a milestone has been waiting', async () => {
  const db = makeDb({
    milestones: inProject([ms({ id: 'm1', status: 'IN_REVIEW' })]),
    events: inProject([
      { id: 'e1', type: 'MILESTONE_SUBMITTED', entityId: 'm1', occurredAt: daysAgo(20) },
      { id: 'e2', type: 'MILESTONE_SUBMITTED', entityId: 'm1', occurredAt: daysAgo(2) },
    ]),
  })
  const { items } = await attention(db)
  assert.equal(items[0].waitingDays, 2)
})

test('a milestone submitted before events existed shows "unknown", not a made-up time', async () => {
  const db = makeDb({ milestones: inProject([ms({ id: 'm1', status: 'IN_REVIEW' })]), events: [] })
  const { items } = await attention(db)
  assert.equal(items[0].since, null)
  assert.equal(items[0].waitingDays, null)
})

test('a role that may not view client requests never even queries them, but still sees milestones', async () => {
  const db = makeDb({
    requests: inProject([req({ id: 'r1' })]),
    milestones: inProject([ms({ id: 'm1', dueDate: daysAgo(4) })]),
  })
  const out = await attention(db, 'VIEWER') // no such project role is allowed in today, so this tests the rule itself
  assert.equal(db.calls.requests.length, 0)
  assert.deepEqual(out.items.map((i) => i.id), ['milestone:m1'])
  assert.equal(out.summary.blocking, 0)
})

test('the result says when a safety cap was hit, and only then', async () => {
  const many = Array.from({ length: 200 }, (_, i) => req({ id: `r${i}`, projectId: PROJECT }))
  assert.equal((await attention(makeDb({ requests: many }))).truncated, true)
  assert.equal((await attention(makeDb({ requests: many.slice(0, 199) }))).truncated, false)
  assert.equal((await attention(makeDb({}))).truncated, false)
})

test('generatedAt reports the clock that was used', async () => {
  assert.equal((await attention(makeDb({}))).generatedAt, NOW.toISOString())
})

test('who may ask: owners, admins, managers and contributors yes; viewers, unassigned and outsiders no', async () => {
  const ask = (db) => getProjectAttention({ userId: 'user_1', projectId: PROJECT, now: NOW }, db)
  for (const [workspaceRole, projectRole] of [['OWNER', null], ['ADMIN', null], ['MEMBER', 'PROJECT_MANAGER'], ['MEMBER', 'CONTRIBUTOR']]) {
    const out = await ask(makeDb({ workspaceRole, projectRole }))
    assert.ok(Array.isArray(out.items), `${workspaceRole}/${projectRole}`)
  }

  const viewer = makeDb({ workspaceRole: 'MEMBER', projectRole: 'VIEWER', milestones: inProject([ms({ dueDate: daysAgo(3) })]) })
  await assert.rejects(() => ask(viewer), (e) => e.name === 'ForbiddenError')
  const unassigned = makeDb({ workspaceRole: 'MEMBER', projectRole: null })
  await assert.rejects(() => ask(unassigned), (e) => e.name === 'ForbiddenError')
  const outsider = makeDb({ workspaceRole: null, projectRole: null })
  await assert.rejects(() => ask(outsider), (e) => e.name === 'NotFoundError')
  assert.equal(viewer.calls.requests.length + viewer.calls.milestones.length + unassigned.calls.milestones.length + outsider.calls.milestones.length, 0, 'nothing is read for a refused user')
})

test('the service makes at most three database calls besides the access check', async () => {
  const db = makeDb({
    requests: inProject(Array.from({ length: 30 }, (_, i) => req({ id: `r${i}` }))),
    milestones: inProject([ms({ id: 'm1', status: 'IN_REVIEW' })]),
  })
  await getProjectAttention({ userId: 'user_1', projectId: PROJECT, now: NOW }, db)
  assert.equal(db.calls.project, 1)
  assert.equal(db.calls.requests.length + db.calls.milestones.length + db.calls.events.length, 3, 'a fixed number of queries, however many items there are')
})