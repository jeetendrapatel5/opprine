// lib/project-activity-feed.test.js
//
// Run with:  node --test lib/project-activity-feed.test.js
//
// Tests the READING side of the project timeline: who may read it, what each
// audience sees, paging, and input validation.
//
// The fake database implements exactly the filters, sort order and `take` that
// the feed uses, so paging behaviour (ties, "no gaps, no repeats") is tested
// for real. What a fake cannot prove, such as index use and true multi-user
// behaviour on Postgres, is covered by the separate end-to-end run, not here.

import test from 'node:test'
import assert from 'node:assert/strict'

// lib/prisma.js and lib/email.js read these when imported; nothing connects.
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test'
process.env.RESEND_API_KEY ??= 're_dummy_key_for_tests'
const { listProjectActivity, listPortalActivity, markProjectActivitySeen, buildStaffWhere, encodeCursor, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } =
  await import('./project-activity-feed.js')

const PROJECT = 'proj_1'
const TOKEN = 'portal-token-abc'
const T0 = Date.parse('2026-11-01T09:00:00.000Z')

// n-th event, oldest = 1. Ids sort the same way as n so ties are predictable.
const row = (n, overrides = {}) => ({
  id: `act_${String(n).padStart(4, '0')}`,
  projectId: PROJECT,
  type: 'MILESTONE_SUBMITTED',
  title: `Event ${n}`,
  actorType: 'USER',
  actorUserId: 'user_1',
  actorName: 'Asha Rao',
  entityId: `ms_${n}`,
  metadata: { milestoneTitle: `M${n}` },
  visibility: 'CLIENT',
  occurredAt: new Date(T0 + n * 1000),
  dedupeKey: `k${n}`,
  ...overrides,
})

function makeDb({ rows = [], workspaceRole = 'OWNER', projectRole = null, reads = {} } = {}) {
  const calls = { findMany: [], project: 0, client: 0 }
  // "userId|projectId" -> Date, like the ProjectActivityRead table.
  const readRows = new Map(Object.entries(reads).map(([k, v]) => [k, new Date(v)]))

  const time = (v) => (v instanceof Date ? v.getTime() : v)
  const matches = (r, where) =>
    Object.entries(where).every(([key, cond]) => {
      if (key === 'OR') return cond.some((clause) => matches(r, clause))
      if (cond instanceof Date) return time(r[key]) === cond.getTime()
      if (cond && typeof cond === 'object') {
        if ('in' in cond) return cond.in.includes(r[key])
        if ('notIn' in cond) return !cond.notIn.includes(r[key])
        if ('lt' in cond) return time(r[key]) < time(cond.lt)
      }
      return r[key] === cond
    })

  return {
    calls,
    reads: readRows,
    projectActivityRead: {
      findUnique: async ({ where }) => {
        const { userId, projectId } = where.userId_projectId
        const at = readRows.get(`${userId}|${projectId}`)
        return at ? { lastSeenAt: at } : null
      },
      createMany: async ({ data, skipDuplicates }) => {
        let count = 0
        for (const d of data) {
          const k = `${d.userId}|${d.projectId}`
          if (readRows.has(k)) {
            if (!skipDuplicates) throw new Error('unique violation')
            continue
          }
          readRows.set(k, new Date(d.lastSeenAt))
          count++
        }
        return { count }
      },
      updateMany: async ({ where, data }) => {
        const k = `${where.userId}|${where.projectId}`
        const cur = readRows.get(k)
        if (!cur || !(cur.getTime() < where.lastSeenAt.lt.getTime())) return { count: 0 }
        readRows.set(k, new Date(data.lastSeenAt))
        return { count: 1 }
      },
    },
    project: {
      findUnique: async () => {
        calls.project++
        return {
          members: projectRole ? [{ role: projectRole }] : [],
          workspace: { members: workspaceRole ? [{ role: workspaceRole }] : [] },
        }
      },
    },
    client: {
      findUnique: async ({ where }) => {
        calls.client++
        return where.magicToken === TOKEN
          ? { id: 'client_1', name: 'Acme Corp', email: null, projectId: PROJECT, project: { id: PROJECT } }
          : null
      },
    },
    projectActivity: {
      findMany: async (args) => {
        calls.findMany.push(args)
        const sorted = rows
          .filter((r) => matches(r, args.where))
          .sort((a, b) => time(b.occurredAt) - time(a.occurredAt) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))
          .slice(0, args.take)
        return sorted.map((r) => Object.fromEntries(Object.entries(args.select).filter(([, on]) => on).map(([k]) => [k, r[k]])))
      },
    },
  }
}

const staff = (db, query, userId = 'user_1') => listProjectActivity({ userId, projectId: PROJECT, query }, db)
const named = (e) => (err) => err.name === e

// ── Who may read it ────────────────────────────────────────────────────────

test('workspace owners and admins, project managers and contributors can read the timeline', async () => {
  for (const [workspaceRole, projectRole] of [['OWNER', null], ['ADMIN', null], ['MEMBER', 'PROJECT_MANAGER'], ['MEMBER', 'CONTRIBUTOR']]) {
    const db = makeDb({ rows: [row(1)], workspaceRole, projectRole })
    const out = await staff(db)
    assert.equal(out.items.length, 1, `${workspaceRole}/${projectRole}`)
  }
})

test('a VIEWER is refused (the permission matrix fails closed for that role)', async () => {
  const db = makeDb({ rows: [row(1)], workspaceRole: 'MEMBER', projectRole: 'VIEWER' })
  await assert.rejects(() => staff(db), named('ForbiddenError'))
  assert.equal(db.calls.findMany.length, 0, 'events must not even be queried')
})

test('a workspace member who is not on the project is refused, an outsider gets "not found"', async () => {
  const notAssigned = makeDb({ rows: [row(1)], workspaceRole: 'MEMBER', projectRole: null })
  await assert.rejects(() => staff(notAssigned), named('ForbiddenError'))
  const outsider = makeDb({ rows: [row(1)], workspaceRole: null, projectRole: null })
  await assert.rejects(() => staff(outsider), named('NotFoundError'))
  assert.equal(notAssigned.calls.findMany.length + outsider.calls.findMany.length, 0)
})

test('an empty userId or projectId is "not found" before anything is read', async () => {
  const db = makeDb({ rows: [row(1)] })
  await assert.rejects(() => listProjectActivity({ userId: '', projectId: PROJECT }, db), named('NotFoundError'))
  await assert.rejects(() => listProjectActivity({ userId: 'user_1', projectId: '' }, db), named('NotFoundError'))
  assert.equal(db.calls.findMany.length, 0)
})

// ── What staff see ─────────────────────────────────────────────────────────

test('only THIS project is queried, and other projects events never appear', async () => {
  const db = makeDb({ rows: [row(1), row(2, { projectId: 'proj_other', title: 'Secret other project' })] })
  const out = await staff(db)
  assert.deepEqual(out.items.map((i) => i.title), ['Event 1'])
  assert.equal(db.calls.findMany[0].where.projectId, PROJECT)
})

test('staff see internal AND client-visible events, with metadata and the entity to link to', async () => {
  const db = makeDb({
    rows: [
      row(1, { type: 'MILESTONE_CREATED', visibility: 'INTERNAL' }),
      row(2, { type: 'CLIENT_REQUEST_SUBMITTED', visibility: 'CLIENT', actorType: 'CLIENT', actorUserId: null, actorName: 'Acme Corp', entityId: 'req_9', metadata: { requestTitle: 'Brand', requestType: 'TEXT', blocksWork: true } }),
    ],
  })
  const { items } = await staff(db)
  assert.deepEqual(items.map((i) => i.visibility), ['CLIENT', 'INTERNAL'])
  assert.deepEqual(items[0].entity, { kind: 'clientRequest', id: 'req_9' })
  assert.deepEqual(items[1].entity, { kind: 'milestone', id: 'ms_1' })
  assert.equal(items[0].metadata.blocksWork, true)
  assert.deepEqual(items[0].actor, { type: 'CLIENT', userId: null, name: 'Acme Corp' })
  assert.deepEqual(Object.keys(items[0]).sort(), ['actor', 'entity', 'id', 'metadata', 'occurredAt', 'title', 'type', 'visibility'])
})

test('the internal dedupe key and project id are never returned', async () => {
  const db = makeDb({ rows: [row(1)] })
  const text = JSON.stringify(await staff(db))
  assert.ok(!text.includes('dedupeKey') && !text.includes('k1') && !text.includes('projectId'))
})

test('a CONTRIBUTOR does not see the client name (they cannot see client details anywhere else)', async () => {
  const rows = [row(1, { type: 'MILESTONE_APPROVED', actorType: 'CLIENT', actorUserId: null, actorName: 'Sandesh Sawant' }), row(2)]
  const contributor = await staff(makeDb({ rows, workspaceRole: 'MEMBER', projectRole: 'CONTRIBUTOR' }))
  assert.equal(contributor.items.find((i) => i.type === 'MILESTONE_APPROVED').actor.name, null)
  assert.equal(contributor.items.find((i) => i.type === 'MILESTONE_SUBMITTED').actor.name, 'Asha Rao', 'team names stay visible')

  const manager = await staff(makeDb({ rows, workspaceRole: 'MEMBER', projectRole: 'PROJECT_MANAGER' }))
  assert.equal(manager.items.find((i) => i.type === 'MILESTONE_APPROVED').actor.name, 'Sandesh Sawant')
  const owner = await staff(makeDb({ rows, workspaceRole: 'OWNER' }))
  assert.equal(owner.items.find((i) => i.type === 'MILESTONE_APPROVED').actor.name, 'Sandesh Sawant')
})

test('a role that may not view client requests gets a filter that removes every request event', () => {
  // No such project role exists today (VIEWER is refused earlier), so the rule
  // is tested directly: the filter must exclude all four request event types.
  const where = buildStaffWhere(PROJECT, 'VIEWER')
  assert.deepEqual(where.type.notIn.sort(), ['CLIENT_REQUEST_ACCEPTED', 'CLIENT_REQUEST_CANCELLED', 'CLIENT_REQUEST_CREATED', 'CLIENT_REQUEST_SUBMITTED'])
  assert.equal(where.projectId, PROJECT)
  // ...and roles that CAN view requests get no type filter at all.
  for (const role of ['OWNER', 'ADMIN', 'PROJECT_MANAGER', 'CONTRIBUTOR']) {
    assert.equal(buildStaffWhere(PROJECT, role).type, undefined, role)
  }
})

// ── Query cost ─────────────────────────────────────────────────────────────

test('one page costs exactly two database calls, however many events it has (no N+1)', async () => {
  const db = makeDb({ rows: Array.from({ length: 40 }, (_, i) => row(i + 1)) })
  const out = await staff(db, { limit: 30 })
  assert.equal(out.items.length, 30)
  assert.equal(db.calls.project, 1)
  assert.equal(db.calls.findMany.length, 1)
  assert.equal(db.calls.findMany[0].take, 31, 'asks for one extra row to learn whether there is another page')
})

// ── Paging ─────────────────────────────────────────────────────────────────

test('paging walks every event exactly once, newest first, including events with identical timestamps', async () => {
  // 25 events; groups of 5 share the same timestamp, and the page size (7) does
  // NOT divide evenly into those groups, so page boundaries fall in the MIDDLE
  // of a group of ties. That is exactly where a missing id tie-break would
  // skip or repeat events.
  const rows = Array.from({ length: 25 }, (_, i) => row(i + 1, { occurredAt: new Date(T0 + Math.floor(i / 5) * 1000) }))
  const db = makeDb({ rows })

  const seen = []
  let cursor
  let pages = 0
  do {
    const out = await staff(db, { limit: 7, cursor })
    seen.push(...out.items.map((i) => i.id))
    cursor = out.nextCursor ?? undefined
    pages++
  } while (cursor)

  assert.equal(pages, 4)
  assert.equal(seen.length, 25)
  assert.equal(new Set(seen).size, 25, 'no repeats')
  const expected = [...rows].sort((a, b) => b.occurredAt - a.occurredAt || (a.id < b.id ? 1 : -1)).map((r) => r.id)
  assert.deepEqual(seen, expected, 'newest first, ties broken by id')
})

test('the last page has no nextCursor, and an exact multiple does not produce an empty extra page', async () => {
  const db = makeDb({ rows: Array.from({ length: 20 }, (_, i) => row(i + 1)) })
  const first = await staff(db, { limit: 10 })
  const second = await staff(db, { limit: 10, cursor: first.nextCursor })
  assert.equal(first.items.length, 10)
  assert.equal(second.items.length, 10)
  assert.equal(second.nextCursor, null)
  assert.equal((await staff(makeDb({ rows: [] }))).nextCursor, null)
})

test('events that arrive after page 1 do not shift page 2 (no skipped or repeated rows)', async () => {
  const rows = Array.from({ length: 12 }, (_, i) => row(i + 1))
  const db = makeDb({ rows })
  const first = await staff(db, { limit: 5 })
  rows.push(row(99, { occurredAt: new Date(T0 + 999000) })) // a brand-new, newest event
  const second = await staff(db, { limit: 5, cursor: first.nextCursor })
  assert.deepEqual(second.items.map((i) => i.id), ['act_0007', 'act_0006', 'act_0005', 'act_0004', 'act_0003'])
})

test('the default page size and the maximum are enforced', async () => {
  const db = makeDb({ rows: Array.from({ length: 80 }, (_, i) => row(i + 1)) })
  assert.equal((await staff(db)).items.length, DEFAULT_PAGE_SIZE)
  assert.equal((await staff(db, { limit: String(MAX_PAGE_SIZE) })).items.length, MAX_PAGE_SIZE, 'a numeric string is fine (it comes from the URL)')
  await assert.rejects(() => staff(db, { limit: MAX_PAGE_SIZE + 1 }), named('ValidationError'))
})

test('bad limits are rejected before any event is read', async () => {
  const db = makeDb({ rows: [row(1)] })
  for (const limit of [0, -1, 2.5, 'abc', '', '1e3', 'NaN']) {
    await assert.rejects(() => staff(db, { limit }), named('ValidationError'), String(limit))
  }
  assert.equal(db.calls.findMany.length, 0)
})

test('malformed cursors are rejected with a clean validation error', async () => {
  const db = makeDb({ rows: [row(1)] })
  const b64 = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url')
  const bad = [
    'garbage',
    '!!!',
    b64('not json'),
    b64({ a: 1 }),
    b64(['2026-11-01T09:00:00.000Z']),
    b64(['not a date', 'act_1']),
    b64(['2026-13-45T00:00:00.000Z', 'act_1']),
    b64(['2026-11-01', 'act_1']), // parseable but not the exact ISO form we issue
    b64(['2026-11-01T09:00:00.000Z', '']),
    b64(['2026-11-01T09:00:00.000Z', 123]),
    b64(['2026-11-01T09:00:00.000Z', 'x'.repeat(101)]),
    'a'.repeat(301),
  ]
  for (const cursor of bad) {
    await assert.rejects(() => staff(db, { cursor }), named('ValidationError'), cursor.slice(0, 30))
  }
  assert.equal(db.calls.findMany.length, 0)
})

test('a cursor pointing at ANOTHER project\'s event reveals nothing: the query is still scoped', async () => {
  const rows = [row(1), row(2), row(3, { projectId: 'proj_other', title: 'Other project secret' })]
  const db = makeDb({ rows })
  const forged = encodeCursor(rows[2]) // an event from a project the caller cannot see
  const out = await staff(db, { cursor: forged })
  assert.ok(out.items.every((i) => i.title !== 'Other project secret'))
  assert.equal(db.calls.findMany[0].where.projectId, PROJECT)
})

test('cursors round-trip exactly', async () => {
  const db = makeDb({ rows: Array.from({ length: 6 }, (_, i) => row(i + 1)) })
  const first = await staff(db, { limit: 2 })
  // page 1 = events 6 and 5, so the cursor must point at event 5
  assert.equal(first.nextCursor, encodeCursor({ occurredAt: new Date(T0 + 5000), id: 'act_0005' }))
})

// ── The client (portal) audience ───────────────────────────────────────────

const portalRows = () => [
  row(1, { type: 'MILESTONE_CREATED', visibility: 'INTERNAL' }),
  row(2, { type: 'DELIVERABLE_UPLOADED', visibility: 'INTERNAL' }),
  row(3, { type: 'MILESTONE_SUBMITTED', visibility: 'CLIENT' }),
  row(4, { type: 'MILESTONE_APPROVED', visibility: 'CLIENT', actorType: 'CLIENT', actorUserId: null, actorName: 'Sandesh Sawant' }),
  row(5, { type: 'GITHUB_PUSH', visibility: 'CLIENT', actorType: 'INTEGRATION', actorUserId: null, actorName: 'GitHub', metadata: { commitSha: 'abc1234' } }),
  // Defence in depth: rows that SAY client-visible but whose TYPE never is.
  row(6, { type: 'MILESTONE_CREATED', visibility: 'CLIENT', title: 'Mislabelled internal event' }),
  row(7, { type: 'CLIENT_REQUEST_CANCELLED', visibility: 'CLIENT', title: 'Legacy cancelled request' }),
  row(8, { type: 'CLIENT_REQUEST_SUBMITTED', visibility: 'CLIENT', actorType: 'CLIENT', actorUserId: null, actorName: 'Sandesh Sawant', metadata: { requestTitle: 'Brand', requestType: 'TEXT', blocksWork: true } }),
  row(9, { projectId: 'proj_other', type: 'MILESTONE_SUBMITTED', visibility: 'CLIENT', title: 'Other project event' }),
]

test('the client sees only client-visible events of the right TYPE, from their own project', async () => {
  const db = makeDb({ rows: portalRows() })
  const { items } = await listPortalActivity({ token: TOKEN }, db)
  assert.deepEqual(items.map((i) => i.type), ['CLIENT_REQUEST_SUBMITTED', 'GITHUB_PUSH', 'MILESTONE_APPROVED', 'MILESTONE_SUBMITTED'])
  const text = JSON.stringify(items)
  for (const forbidden of ['Mislabelled', 'Legacy cancelled', 'Other project', 'DELIVERABLE_UPLOADED', 'MILESTONE_CREATED']) {
    assert.ok(!text.includes(forbidden), forbidden)
  }
})

test('the client projection has ONLY id, type, title, occurredAt and a small actor', async () => {
  const db = makeDb({ rows: portalRows() })
  const { items } = await listPortalActivity({ token: TOKEN }, db)
  for (const item of items) {
    assert.deepEqual(Object.keys(item).sort(), ['actor', 'id', 'occurredAt', 'title', 'type'])
    assert.deepEqual(Object.keys(item.actor).sort(), ['name', 'type'])
  }
  const text = JSON.stringify(items)
  for (const secret of ['blocksWork', 'metadata', 'commitSha', 'requestTitle', 'user_1', 'entityId', 'dedupeKey', 'ms_', 'visibility']) {
    assert.ok(!text.includes(secret), `leaked: ${secret}`)
  }
})

test('the database is asked for only safe columns (so private data is never even loaded)', async () => {
  const db = makeDb({ rows: portalRows() })
  await listPortalActivity({ token: TOKEN }, db)
  const { select, where } = db.calls.findMany[0]
  assert.deepEqual(Object.keys(select).sort(), ['actorName', 'actorType', 'id', 'occurredAt', 'title', 'type'])
  assert.equal(where.visibility, 'CLIENT')
  assert.ok(Array.isArray(where.type.in) && !where.type.in.includes('MILESTONE_CREATED') && !where.type.in.includes('CLIENT_REQUEST_CANCELLED'))
  assert.equal(where.projectId, PROJECT)
})

test('team member names are hidden from the client; the client name and GitHub are shown', async () => {
  const db = makeDb({ rows: portalRows() })
  const { items } = await listPortalActivity({ token: TOKEN }, db)
  const by = (type) => items.find((i) => i.type === type).actor
  assert.deepEqual(by('MILESTONE_SUBMITTED'), { type: 'USER', name: null })
  assert.deepEqual(by('MILESTONE_APPROVED'), { type: 'CLIENT', name: 'Sandesh Sawant' })
  assert.deepEqual(by('GITHUB_PUSH'), { type: 'INTEGRATION', name: 'GitHub' })
})

test('an invalid portal token reads nothing', async () => {
  const db = makeDb({ rows: portalRows() })
  await assert.rejects(() => listPortalActivity({ token: 'nope' }, db), named('NotFoundError'))
  await assert.rejects(() => listPortalActivity({ token: '' }, db), named('NotFoundError'))
  assert.equal(db.calls.findMany.length, 0)
})

test('the client timeline pages the same way (no repeats, validated input)', async () => {
  const rows = Array.from({ length: 12 }, (_, i) => row(i + 1, { visibility: 'CLIENT' }))
  const db = makeDb({ rows })
  const first = await listPortalActivity({ token: TOKEN, query: { limit: 5 } }, db)
  const second = await listPortalActivity({ token: TOKEN, query: { limit: 5, cursor: first.nextCursor } }, db)
  const third = await listPortalActivity({ token: TOKEN, query: { limit: 5, cursor: second.nextCursor } }, db)
  const ids = [...first.items, ...second.items, ...third.items].map((i) => i.id)
  assert.equal(new Set(ids).size, 12)
  assert.equal(third.nextCursor, null)
  await assert.rejects(() => listPortalActivity({ token: TOKEN, query: { limit: 999 } }, db), named('ValidationError'))
  await assert.rejects(() => listPortalActivity({ token: TOKEN, query: { cursor: 'bad' } }, db), named('ValidationError'))
})

// ── "Since your last visit" (per-user read marker) ─────────────────────────

const seen = (db, body, userId = 'user_1', projectId = PROJECT) => markProjectActivitySeen({ userId, projectId, body }, db)
const KEY = `user_1|${PROJECT}`

test('lastSeenAt is null until the person has opened the panel, then it is theirs alone', async () => {
  const none = await staff(makeDb({ rows: [row(1)] }))
  assert.equal(none.lastSeenAt, null)
  const db = makeDb({ rows: [row(1)], reads: { [KEY]: '2026-11-01T09:00:05.000Z', [`user_2|${PROJECT}`]: '2026-11-02T00:00:00.000Z' } })
  const mine = await staff(db)
  assert.equal(new Date(mine.lastSeenAt).toISOString(), '2026-11-01T09:00:05.000Z')
  const other = await staff(db, undefined, 'user_3')
  assert.equal(other.lastSeenAt, null, 'another user and another project never share a marker')
})

test('marking seen creates the marker at `through`, and without a body it means "now"', async () => {
  const db = makeDb({ rows: [row(1)] })
  const out = await seen(db, { through: '2026-11-01T09:00:03.000Z' })
  assert.equal(out.lastSeenAt.toISOString(), '2026-11-01T09:00:03.000Z')
  const db2 = makeDb({ rows: [row(1)] })
  const before = Date.now()
  const out2 = await seen(db2, undefined)
  assert.ok(out2.lastSeenAt.getTime() >= before && out2.lastSeenAt.getTime() <= Date.now())
})

test('the marker only moves forward (an older `through` changes nothing)', async () => {
  const db = makeDb({ reads: { [KEY]: '2026-11-05T00:00:00.000Z' } })
  const out = await seen(db, { through: '2026-11-01T00:00:00.000Z' })
  assert.equal(out.lastSeenAt.toISOString(), '2026-11-05T00:00:00.000Z')
  const up = await seen(db, { through: '2026-11-06T00:00:00.000Z' })
  assert.equal(up.lastSeenAt.toISOString(), '2026-11-06T00:00:00.000Z')
})

test('a `through` in the future is clamped to the server clock', async () => {
  const db = makeDb({})
  const out = await seen(db, { through: '2999-01-01T00:00:00.000Z' })
  assert.ok(out.lastSeenAt.getTime() <= Date.now())
})

test('bad `through` values are refused and nothing is written', async () => {
  for (const through of ['tomorrow', '', 12345, {}]) {
    const db = makeDb({})
    await assert.rejects(() => seen(db, { through }), named('ValidationError'), String(through))
    assert.equal(db.reads.size, 0)
  }
})

test('marking seen uses the same access rules as reading', async () => {
  const viewer = makeDb({ workspaceRole: 'MEMBER', projectRole: 'VIEWER' })
  await assert.rejects(() => seen(viewer, {}), named('ForbiddenError'))
  const notAssigned = makeDb({ workspaceRole: 'MEMBER', projectRole: null })
  await assert.rejects(() => seen(notAssigned, {}), named('ForbiddenError'))
  const outsider = makeDb({ workspaceRole: null, projectRole: null })
  await assert.rejects(() => seen(outsider, {}), named('NotFoundError'))
  assert.equal(viewer.reads.size + notAssigned.reads.size + outsider.reads.size, 0)
})