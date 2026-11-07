// lib/project-activity.test.js
//
// Run with:  node --test lib/project-activity.test.js
// Uses Node's built-in test runner. No database needed: recordActivity is
// given a tiny fake `db` that remembers what it was asked to insert.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  ACTIVITY_TYPES,
  CLIENT_VISIBLE_TYPES,
  ActivityRecordingError,
  buildActivityRow,
  getActivityEntityKind,
  recordActivity,
  recordActivities,
} from './project-activity.js'

const USER = { type: 'USER', userId: 'user_1', name: 'Asha Rao' }
const CLIENT = { type: 'CLIENT', name: 'Acme Corp' }
const GITHUB = { type: 'INTEGRATION', name: 'GitHub' }
const WHEN = new Date('2026-11-02T10:00:00.000Z')

const requestMeta = { requestTitle: 'Brand assets', requestType: 'FILE', blocksWork: true }

// One valid example input for every type, used by several tests.
const EXAMPLES = {
  PROJECT_UPDATE_POSTED: { actor: USER, entityId: 'upd_1', metadata: { excerpt: 'Header done' } },
  GITHUB_PUSH: { actor: GITHUB, entityId: 'upd_2', externalId: 'a'.repeat(40), metadata: { commitSha: 'aaaaaaa' } },
  MILESTONE_CREATED: { actor: USER, entityId: 'ms_1', metadata: { milestoneTitle: 'Homepage' } },
  MILESTONE_SUBMITTED: { actor: USER, entityId: 'ms_1', occurredAt: WHEN, metadata: { milestoneTitle: 'Homepage' } },
  MILESTONE_APPROVED: { actor: CLIENT, entityId: 'ms_1', occurredAt: WHEN, metadata: { milestoneTitle: 'Homepage' } },
  MILESTONE_CHANGES_REQUESTED: { actor: CLIENT, entityId: 'ms_1', occurredAt: WHEN, metadata: { milestoneTitle: 'Homepage' } },
  MILESTONE_COMPLETED: { actor: USER, entityId: 'ms_1', occurredAt: WHEN, metadata: { milestoneTitle: 'Homepage' } },
  MILESTONE_UPDATE_POSTED: { actor: USER, entityId: 'mu_1', metadata: { milestoneId: 'ms_1', milestoneTitle: 'Homepage' } },
  DELIVERABLE_UPLOADED: { actor: USER, entityId: 'mu_2', metadata: { milestoneId: 'ms_1', milestoneTitle: 'Homepage' } },
  CLIENT_REQUEST_CREATED: { actor: USER, entityId: 'req_1', metadata: requestMeta },
  CLIENT_REQUEST_SUBMITTED: { actor: CLIENT, entityId: 'req_1', metadata: requestMeta },
  CLIENT_REQUEST_ACCEPTED: { actor: USER, entityId: 'req_1', metadata: requestMeta },
  CLIENT_REQUEST_CANCELLED: { actor: USER, entityId: 'req_1', metadata: requestMeta },
}

const build = (type, overrides = {}) =>
  buildActivityRow({ projectId: 'proj_1', type, ...EXAMPLES[type], ...overrides })

// A fake Prisma client. `inserted` reports how many rows to say were new.
function fakeDb(inserted) {
  const calls = []
  return {
    calls,
    projectActivity: {
      createMany: async (args) => {
        calls.push(args)
        return { count: inserted ?? args.data.length }
      },
    },
  }
}

// ── Keeping this file and the Prisma schema in sync ────────────────────────

test('every ProjectActivityType in the Prisma schema has a definition, and vice versa', () => {
  const schema = readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8')
  const body = schema.match(/enum ProjectActivityType \{([\s\S]*?)\n\}/)[1]
  const inSchema = body
    .split('\n')
    .map((line) => line.replace(/\/\/.*/, '').trim())
    .filter(Boolean)
  assert.deepEqual([...inSchema].sort(), [...ACTIVITY_TYPES].sort())
})

test('the examples used in these tests cover every type', () => {
  assert.deepEqual(Object.keys(EXAMPLES).sort(), [...ACTIVITY_TYPES].sort())
})

// ── Visibility ──────────────────────────────────────────────────────────────

test('visibility follows the approved table', () => {
  const expectedClient = [
    'PROJECT_UPDATE_POSTED',
    'GITHUB_PUSH',
    'MILESTONE_SUBMITTED',
    'MILESTONE_APPROVED',
    'MILESTONE_CHANGES_REQUESTED',
    'CLIENT_REQUEST_CREATED',
    'CLIENT_REQUEST_SUBMITTED',
    'CLIENT_REQUEST_ACCEPTED',
  ]
  // CLIENT_REQUEST_CANCELLED is deliberately NOT here: the portal hides
  // cancelled requests from the client, so the timeline must not announce them.
  for (const type of ACTIVITY_TYPES) {
    const row = build(type)
    assert.equal(row.visibility, expectedClient.includes(type) ? 'CLIENT' : 'INTERNAL', type)
  }
  assert.deepEqual([...CLIENT_VISIBLE_TYPES].sort(), [...expectedClient].sort())
})

test('a caller cannot make an internal event client-visible', () => {
  const row = build('MILESTONE_CREATED', { visibility: 'CLIENT' })
  assert.equal(row.visibility, 'INTERNAL')
  assert.ok(!('visibility' in EXAMPLES.MILESTONE_CREATED))
})

// ── Dedupe keys ─────────────────────────────────────────────────────────────

test('dedupe keys are stable and built from real ids', () => {
  assert.equal(build('PROJECT_UPDATE_POSTED').dedupeKey, 'update:upd_1:posted')
  assert.equal(build('GITHUB_PUSH').dedupeKey, `github:${'a'.repeat(40)}`)
  assert.equal(build('MILESTONE_CREATED').dedupeKey, 'milestone:ms_1:created')
  assert.equal(build('MILESTONE_UPDATE_POSTED').dedupeKey, 'milestoneUpdate:mu_1:posted')
  assert.equal(build('CLIENT_REQUEST_CREATED').dedupeKey, 'request:req_1:created')
  assert.equal(build('CLIENT_REQUEST_SUBMITTED').dedupeKey, 'request:req_1:submitted')
  assert.equal(build('CLIENT_REQUEST_ACCEPTED').dedupeKey, 'request:req_1:accepted')
  assert.equal(build('CLIENT_REQUEST_CANCELLED').dedupeKey, 'request:req_1:cancelled')
  // same input twice -> same key (this is what makes retries safe)
  assert.equal(build('MILESTONE_SUBMITTED').dedupeKey, build('MILESTONE_SUBMITTED').dedupeKey)
})

test('the same milestone can be submitted twice: each transition gets its own key', () => {
  const first = build('MILESTONE_SUBMITTED', { occurredAt: new Date('2026-11-02T10:00:00Z') })
  const second = build('MILESTONE_SUBMITTED', { occurredAt: new Date('2026-11-05T09:30:00Z') })
  assert.notEqual(first.dedupeKey, second.dedupeKey)
  // ...and different transition types never collide at the same instant
  const approved = build('MILESTONE_APPROVED', { occurredAt: new Date('2026-11-02T10:00:00Z') })
  assert.notEqual(first.dedupeKey, approved.dedupeKey)
})

test('events that need extra input refuse to be recorded without it', () => {
  assert.throws(() => build('GITHUB_PUSH', { externalId: undefined }), /needs externalId/)
  assert.throws(() => build('MILESTONE_SUBMITTED', { occurredAt: undefined }), /needs occurredAt/)
})

// ── Actors ──────────────────────────────────────────────────────────────────

test('actor fields are stored as a snapshot', () => {
  const row = build('PROJECT_UPDATE_POSTED')
  assert.equal(row.actorType, 'USER')
  assert.equal(row.actorUserId, 'user_1')
  assert.equal(row.actorName, 'Asha Rao')

  const clientRow = build('CLIENT_REQUEST_SUBMITTED')
  assert.equal(clientRow.actorType, 'CLIENT')
  assert.equal(clientRow.actorUserId, null)
  assert.equal(clientRow.actorName, 'Acme Corp')
})

test('only the right kind of actor may perform each event', () => {
  // the client approves milestones; the team cannot do it on their behalf
  assert.throws(() => build('MILESTONE_APPROVED', { actor: USER }), /cannot be performed/)
  assert.throws(() => build('CLIENT_REQUEST_SUBMITTED', { actor: USER }), /cannot be performed/)
  // the team posts updates; a client cannot
  assert.throws(() => build('PROJECT_UPDATE_POSTED', { actor: CLIENT }), /cannot be performed/)
  assert.throws(() => build('GITHUB_PUSH', { actor: USER }), /cannot be performed/)
  assert.throws(() => build('MILESTONE_CREATED', { actor: undefined }), /cannot be performed/)
})

test('a USER actor needs a userId, and other actors must not carry one', () => {
  assert.throws(() => build('MILESTONE_CREATED', { actor: { type: 'USER', name: 'No id' } }), /userId/)
  assert.throws(
    () => build('MILESTONE_APPROVED', { actor: { type: 'CLIENT', userId: 'user_1', name: 'x' } }),
    /Only USER actors carry a userId/
  )
})

test('a user without a name is allowed (name is stored as null)', () => {
  const row = build('MILESTONE_CREATED', { actor: { type: 'USER', userId: 'user_9', name: null } })
  assert.equal(row.actorName, null)
})

// ── Titles and metadata ─────────────────────────────────────────────────────

test('titles are built centrally', () => {
  assert.equal(build('MILESTONE_SUBMITTED').title, '“Homepage” submitted for review')
  assert.equal(build('MILESTONE_APPROVED').title, '“Homepage” approved by the client')
  assert.equal(build('CLIENT_REQUEST_CREATED').title, 'Requested from client: Brand assets')
  assert.equal(build('GITHUB_PUSH').title, 'Code pushed to GitHub')
})

test('long text is clipped, never rejected, so it cannot block a real action', () => {
  const longTitle = 'A very long milestone title '.repeat(30)
  const row = build('MILESTONE_SUBMITTED', { metadata: { milestoneTitle: longTitle } })
  assert.ok(row.metadata.milestoneTitle.length <= 120)
  assert.ok(row.metadata.milestoneTitle.endsWith('…'))
  assert.ok(row.title.length <= 200)

  const update = build('PROJECT_UPDATE_POSTED', { metadata: { excerpt: 'word '.repeat(200) } })
  assert.ok(update.metadata.excerpt.length <= 160)
})

test('a blank title falls back to a readable placeholder', () => {
  const row = build('MILESTONE_CREATED', { metadata: { milestoneTitle: '   ' } })
  assert.equal(row.metadata.milestoneTitle, 'Untitled')
})

test('unexpected metadata keys are rejected (stops private fields leaking in)', () => {
  assert.throws(
    () => build('CLIENT_REQUEST_SUBMITTED', { metadata: { ...requestMeta, answerText: 'secret' } }),
    ActivityRecordingError
  )
  assert.throws(
    () => build('MILESTONE_CREATED', { metadata: { milestoneTitle: 'Homepage', internalNotes: 'x' } }),
    /Invalid metadata/
  )
})

test('required metadata is enforced', () => {
  assert.throws(() => build('CLIENT_REQUEST_CREATED', { metadata: { requestTitle: 'x' } }), /Invalid metadata/)
  assert.throws(() => build('MILESTONE_CREATED', { metadata: {} }), /Invalid metadata/)
})

test('empty optional metadata is omitted from the row, not stored as null', () => {
  const row = build('PROJECT_UPDATE_POSTED', { metadata: {} })
  assert.ok(!('metadata' in row))
  const noExcerpt = build('PROJECT_UPDATE_POSTED', { metadata: { excerpt: '   ' } })
  assert.ok(!('metadata' in noExcerpt))
})

test('null and undefined optional ids are dropped from metadata', () => {
  const row = build('CLIENT_REQUEST_CREATED', { metadata: { ...requestMeta, milestoneId: null } })
  assert.deepEqual(row.metadata, requestMeta)
  const linked = build('CLIENT_REQUEST_CREATED', { metadata: { ...requestMeta, milestoneId: 'ms_9' } })
  assert.equal(linked.metadata.milestoneId, 'ms_9')
})

// ── Basic input checks ──────────────────────────────────────────────────────

test('unknown types, missing ids and bad dates are rejected', () => {
  assert.throws(() => buildActivityRow({ projectId: 'p', type: 'TASK_MOVED', entityId: 'x', actor: USER }), /Unknown activity type/)
  assert.throws(() => build('MILESTONE_CREATED', { projectId: '' }), /projectId/)
  assert.throws(() => build('MILESTONE_CREATED', { entityId: undefined }), /entityId/)
  assert.throws(() => build('MILESTONE_CREATED', { occurredAt: new Date('not a date') }), /invalid occurredAt/)
  assert.throws(() => build('MILESTONE_CREATED', { occurredAt: '2026-11-02' }), /invalid occurredAt/)
})

test('occurredAt defaults to now when not provided', () => {
  const before = Date.now()
  const row = build('MILESTONE_CREATED')
  assert.ok(row.occurredAt.getTime() >= before && row.occurredAt.getTime() <= Date.now())
})

test('every type maps to an entity kind', () => {
  for (const type of ACTIVITY_TYPES) assert.ok(getActivityEntityKind(type), type)
  assert.equal(getActivityEntityKind('CLIENT_REQUEST_CREATED'), 'clientRequest')
  assert.equal(getActivityEntityKind('NOPE'), null)
})

// ── Writing to the database ────────────────────────────────────────────────

test('recordActivity inserts one row with skipDuplicates', async () => {
  const db = fakeDb()
  const result = await recordActivity(db, { projectId: 'proj_1', type: 'MILESTONE_CREATED', ...EXAMPLES.MILESTONE_CREATED })
  assert.deepEqual(result, { created: true })
  assert.equal(db.calls.length, 1)
  assert.equal(db.calls[0].skipDuplicates, true)
  assert.equal(db.calls[0].data.length, 1)
  assert.equal(db.calls[0].data[0].dedupeKey, 'milestone:ms_1:created')
})

test('recording the same event again reports created: false (idempotent retry)', async () => {
  const db = fakeDb(0) // pretend the database skipped the row as a duplicate
  const result = await recordActivity(db, { projectId: 'proj_1', type: 'GITHUB_PUSH', ...EXAMPLES.GITHUB_PUSH })
  assert.deepEqual(result, { created: false })
})

test('recordActivities inserts many rows in ONE call and reports skipped ones', async () => {
  const db = fakeDb(2)
  const inputs = ['req_1', 'req_2', 'req_3'].map((id) => ({
    projectId: 'proj_1',
    type: 'CLIENT_REQUEST_CREATED',
    ...EXAMPLES.CLIENT_REQUEST_CREATED,
    entityId: id,
  }))
  const result = await recordActivities(db, inputs)
  assert.deepEqual(result, { created: 2, skipped: 1 })
  assert.equal(db.calls.length, 1)
  assert.equal(db.calls[0].data.length, 3)
})

test('recordActivities with no events does not touch the database', async () => {
  const db = fakeDb()
  assert.deepEqual(await recordActivities(db, []), { created: 0, skipped: 0 })
  assert.equal(db.calls.length, 0)
})

test('one invalid event stops the whole batch before anything is written', async () => {
  const db = fakeDb()
  const good = { projectId: 'proj_1', type: 'MILESTONE_CREATED', ...EXAMPLES.MILESTONE_CREATED }
  const bad = { projectId: 'proj_1', type: 'MILESTONE_CREATED', actor: CLIENT, entityId: 'ms_2', metadata: { milestoneTitle: 'x' } }
  await assert.rejects(() => recordActivities(db, [good, bad]), ActivityRecordingError)
  assert.equal(db.calls.length, 0)
})

test('recordActivity refuses to run without a database client', async () => {
  const input = { projectId: 'proj_1', type: 'MILESTONE_CREATED', ...EXAMPLES.MILESTONE_CREATED }
  await assert.rejects(() => recordActivity(undefined, input), /Prisma client or transaction client/)
  await assert.rejects(() => recordActivity({}, input), /Prisma client or transaction client/)
})