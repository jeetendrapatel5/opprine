// lib/client-requests.activity.test.js
//
// Run with:  node --test lib/client-requests.activity.test.js
//
// Tests ONLY the project-timeline part of lib/client-requests.js: which events
// are recorded, who is the actor, what is (and is not) in them, and that a
// request change and its event are saved together or not at all.
//
// The fake database below is small on purpose, but unlike a plain mock its
// $transaction really rolls back: if the callback throws, everything written
// inside it is undone. That is what lets us test "the event failed, so the
// request did not change either".

import test, { mock } from 'node:test'
import assert from 'node:assert/strict'

// Two modules insist on environment variables the moment they are imported:
// lib/prisma.js wants DATABASE_URL and lib/email.js wants RESEND_API_KEY.
// Nothing here connects or sends (the fake db below replaces prisma, and no
// request in these tests emails anyone), so dummy values are enough.
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test'
process.env.RESEND_API_KEY ??= 're_dummy_key_for_tests'
const { createClientRequests, updateClientRequest, submitPortalRequest, submitPortalFileRequest } =
  await import('./client-requests.js')

const PROJECT = 'proj_1'
const TOKEN = 'portal-token-abc'
const STAFF = 'user_1'
const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(32, 65)])

function makeDb({ requests = [], workspaceRole = 'OWNER', projectRole = null, failActivity = false } = {}) {
  const state = { requests: requests.map((r) => ({ ...baseRequest(), ...r })), events: [], nextId: 1 }
  const keys = new Set()
  const matches = (row, where) =>
    Object.entries(where).every(([k, v]) =>
      v && typeof v === 'object' && 'in' in v ? v.in.includes(row[k]) : row[k] === v
    )

  const db = {
    state,
    $transaction: async (fn) => {
      const snapshot = structuredClone({ requests: state.requests, events: state.events })
      const snapshotKeys = new Set(keys)
      try {
        return await fn(db)
      } catch (err) {
        state.requests = snapshot.requests
        state.events = snapshot.events
        keys.clear()
        snapshotKeys.forEach((k) => keys.add(k))
        throw err
      }
    },
    project: {
      findUnique: async ({ select }) =>
        select.members
          ? {
              members: projectRole ? [{ role: projectRole }] : [],
              workspace: { members: workspaceRole ? [{ role: workspaceRole }] : [] },
            }
          : { name: 'Site', client: { name: 'Acme Corp', email: null, magicToken: TOKEN } },
    },
    milestone: { findFirst: async ({ where }) => ({ id: where.id }) },
    user: { findUnique: async () => ({ name: 'Asha Rao' }) },
    client: {
      findUnique: async ({ where }) =>
        where.magicToken === TOKEN
          ? {
              id: 'client_1',
              name: 'Acme Corp',
              email: null,
              projectId: PROJECT,
              project: { id: PROJECT, name: 'Site', workspaceId: 'ws_1', user: { name: 'Asha Rao', email: null } },
            }
          : null,
    },
    clientRequest: {
      count: async ({ where }) => state.requests.filter((r) => matches(r, where)).length,
      createManyAndReturn: async ({ data }) =>
        data.map((d) => {
          const row = { ...baseRequest(), ...d, id: `req_${state.nextId++}`, createdAt: new Date(), status: 'OPEN' }
          state.requests.push(row)
          return { ...row }
        }),
      findFirst: async ({ where }) => {
        const row = state.requests.find((r) => matches(r, where))
        return row ? { ...row } : null
      },
      updateMany: async ({ where, data }) => {
        const rows = state.requests.filter((r) => matches(r, where))
        rows.forEach((r) => Object.assign(r, data))
        return { count: rows.length }
      },
    },
    projectActivity: {
      createMany: async ({ data }) => {
        if (failActivity) throw new Error('activity insert failed')
        let count = 0
        for (const row of data) {
          const key = `${row.projectId}|${row.dedupeKey}`
          if (keys.has(key)) continue
          keys.add(key)
          state.events.push(row)
          count++
        }
        return { count }
      },
    },
  }
  return db
}

function baseRequest() {
  return {
    id: 'req_x',
    projectId: PROJECT,
    milestoneId: null,
    title: 'Brand assets',
    instructions: null,
    type: 'TEXT',
    blocksWork: true,
    dueDate: null,
    status: 'OPEN',
    answerText: null,
    approved: null,
    createdAt: new Date('2026-11-01T09:00:00Z'),
    createdByUserId: STAFF,
  }
}

const silence = () => mock.method(console, 'error', () => {}) // notify() has no fake tables here

// ── Creating requests ──────────────────────────────────────────────────────

test('creating requests records one CLIENT_REQUEST_CREATED event per request, in ONE insert', async () => {
  const db = makeDb()
  let insertCalls = 0
  const original = db.projectActivity.createMany
  db.projectActivity.createMany = async (args) => (insertCalls++, original(args))

  const { requests } = await createClientRequests(
    {
      userId: STAFF,
      projectId: PROJECT,
      input: {
        notifyClient: false,
        milestoneId: 'ms_1',
        requests: [
          { title: 'Brand assets', type: 'FILE', blocksWork: true },
          { title: 'Approve the wireframes', type: 'APPROVAL', blocksWork: false },
        ],
      },
    },
    db
  )

  assert.equal(requests.length, 2)
  assert.equal(insertCalls, 1)
  assert.equal(db.state.events.length, 2)

  const [first, second] = db.state.events
  assert.equal(first.type, 'CLIENT_REQUEST_CREATED')
  assert.equal(first.entityId, requests[0].id)
  assert.equal(first.dedupeKey, `request:${requests[0].id}:created`)
  assert.equal(first.actorType, 'USER')
  assert.equal(first.actorUserId, STAFF)
  assert.equal(first.actorName, 'Asha Rao')
  assert.equal(first.visibility, 'CLIENT')
  assert.equal(first.title, 'Requested from client: Brand assets')
  assert.deepEqual(first.metadata, { requestTitle: 'Brand assets', requestType: 'FILE', blocksWork: true, milestoneId: 'ms_1' })
  assert.equal(first.occurredAt.getTime(), requests[0].createdAt.getTime())
  // blocking is recorded as it really is: a non-blocking request stays non-blocking
  assert.equal(second.metadata.blocksWork, false)
})

test('if the event cannot be saved, NO request is created either', async () => {
  const db = makeDb({ failActivity: true })
  await assert.rejects(
    () => createClientRequests({ userId: STAFF, projectId: PROJECT, input: { notifyClient: false, requests: [{ title: 'x', type: 'TEXT' }] } }, db),
    /activity insert failed/
  )
  assert.equal(db.state.requests.length, 0)
})

test('a user who may not manage requests records nothing and creates nothing', async () => {
  const db = makeDb({ workspaceRole: 'MEMBER', projectRole: 'VIEWER' })
  await assert.rejects(
    () => createClientRequests({ userId: STAFF, projectId: PROJECT, input: { notifyClient: false, requests: [{ title: 'x', type: 'TEXT' }] } }, db),
    (err) => err.name === 'ForbiddenError'
  )
  assert.equal(db.state.requests.length, 0)
  assert.equal(db.state.events.length, 0)
})

// ── Accept / cancel / edit ─────────────────────────────────────────────────

test('accepting a submitted request records CLIENT_REQUEST_ACCEPTED at the acceptedAt time', async () => {
  const db = makeDb({ requests: [{ id: 'req_1', status: 'SUBMITTED', answerText: 'Secret answer' }] })
  const row = await updateClientRequest({ userId: STAFF, projectId: PROJECT, requestId: 'req_1', input: { action: 'accept' } }, db)

  assert.equal(row.status, 'ACCEPTED')
  assert.equal(db.state.events.length, 1)
  const [event] = db.state.events
  assert.equal(event.type, 'CLIENT_REQUEST_ACCEPTED')
  assert.equal(event.actorUserId, STAFF)
  assert.equal(event.actorName, 'Asha Rao')
  assert.equal(event.dedupeKey, 'request:req_1:accepted')
  assert.equal(event.occurredAt.getTime(), row.acceptedAt.getTime())
  assert.ok(!JSON.stringify(event).includes('Secret answer'), 'the client answer must never be copied into an event')
})

test('accepting twice, or accepting before the client answered, records nothing new', async () => {
  const db = makeDb({ requests: [{ id: 'req_1', status: 'SUBMITTED' }, { id: 'req_2', status: 'OPEN' }] })
  const accept = (requestId) => updateClientRequest({ userId: STAFF, projectId: PROJECT, requestId, input: { action: 'accept' } }, db)

  await accept('req_1')
  await assert.rejects(() => accept('req_1'), (err) => err.name === 'ConflictError')
  await assert.rejects(() => accept('req_2'), (err) => err.name === 'ConflictError')
  assert.equal(db.state.events.length, 1)
})

test('cancelling an open request records CLIENT_REQUEST_CANCELLED once', async () => {
  const db = makeDb({ requests: [{ id: 'req_1', status: 'OPEN' }] })
  const cancel = () => updateClientRequest({ userId: STAFF, projectId: PROJECT, requestId: 'req_1', input: { action: 'cancel' } }, db)

  const row = await cancel()
  assert.equal(row.status, 'CANCELLED')
  assert.equal(db.state.events.length, 1)
  assert.equal(db.state.events[0].type, 'CLIENT_REQUEST_CANCELLED')
  assert.equal(db.state.events[0].title, 'Request “Brand assets” cancelled')

  await assert.rejects(cancel, (err) => err.name === 'ConflictError')
  assert.equal(db.state.events.length, 1)
})

test('editing a request is not a timeline event', async () => {
  const db = makeDb({ requests: [{ id: 'req_1', status: 'OPEN' }] })
  const row = await updateClientRequest({ userId: STAFF, projectId: PROJECT, requestId: 'req_1', input: { action: 'update', title: 'Brand assets v2' } }, db)
  assert.equal(row.title, 'Brand assets v2')
  assert.equal(db.state.events.length, 0)
})

test('a request from another project is "not found" and records nothing', async () => {
  const db = makeDb({ requests: [{ id: 'req_other', projectId: 'proj_2', status: 'SUBMITTED' }] })
  await assert.rejects(
    () => updateClientRequest({ userId: STAFF, projectId: PROJECT, requestId: 'req_other', input: { action: 'accept' } }, db),
    (err) => err.name === 'NotFoundError'
  )
  assert.equal(db.state.events.length, 0)
  assert.equal(db.state.requests[0].status, 'SUBMITTED')
})

test('if the event cannot be saved, accepting is rolled back', async () => {
  const db = makeDb({ requests: [{ id: 'req_1', status: 'SUBMITTED' }], failActivity: true })
  await assert.rejects(
    () => updateClientRequest({ userId: STAFF, projectId: PROJECT, requestId: 'req_1', input: { action: 'accept' } }, db),
    /activity insert failed/
  )
  assert.equal(db.state.requests[0].status, 'SUBMITTED')
  assert.equal(db.state.requests[0].acceptedAt, undefined)
})

// ── The client answers (portal) ────────────────────────────────────────────

test('a text answer records CLIENT_REQUEST_SUBMITTED with the client as actor and NO answer text', async () => {
  silence()
  const db = makeDb({ requests: [{ id: 'req_1', status: 'OPEN', type: 'TEXT', blocksWork: true, milestoneId: 'ms_1' }] })
  const out = await submitPortalRequest({ token: TOKEN, requestId: 'req_1', input: { answerText: 'Our colours are teal and orange' } }, db)

  assert.equal(out.status, 'SUBMITTED')
  assert.equal(db.state.events.length, 1)
  const [event] = db.state.events
  assert.equal(event.type, 'CLIENT_REQUEST_SUBMITTED')
  assert.equal(event.actorType, 'CLIENT')
  assert.equal(event.actorName, 'Acme Corp')
  assert.equal(event.actorUserId, null)
  assert.equal(event.dedupeKey, 'request:req_1:submitted')
  assert.equal(event.visibility, 'CLIENT')
  assert.deepEqual(event.metadata, { requestTitle: 'Brand assets', requestType: 'TEXT', blocksWork: true, milestoneId: 'ms_1' })
  assert.equal(event.occurredAt.getTime(), db.state.requests[0].submittedAt.getTime())
  assert.ok(!JSON.stringify(event).includes('teal'), 'the answer must never be copied into an event')
  mock.restoreAll()
})

test('answering twice records one event (the second answer is refused)', async () => {
  silence()
  const db = makeDb({ requests: [{ id: 'req_1', status: 'OPEN', type: 'TEXT' }] })
  const answer = () => submitPortalRequest({ token: TOKEN, requestId: 'req_1', input: { answerText: 'hello' } }, db)
  await answer()
  await assert.rejects(answer, (err) => err.name === 'ConflictError')
  assert.equal(db.state.events.length, 1)
  mock.restoreAll()
})

test('if the event cannot be saved, the client answer is rolled back (request stays OPEN)', async () => {
  silence()
  const db = makeDb({ requests: [{ id: 'req_1', status: 'OPEN', type: 'TEXT' }], failActivity: true })
  await assert.rejects(
    () => submitPortalRequest({ token: TOKEN, requestId: 'req_1', input: { answerText: 'hello' } }, db),
    /activity insert failed/
  )
  assert.equal(db.state.requests[0].status, 'OPEN')
  assert.equal(db.state.requests[0].answerText, null)
  mock.restoreAll()
})

test('a wrong token, or a cancelled request, records nothing', async () => {
  silence()
  const db = makeDb({ requests: [{ id: 'req_1', status: 'OPEN', type: 'TEXT' }, { id: 'req_2', status: 'CANCELLED', type: 'TEXT' }] })
  await assert.rejects(() => submitPortalRequest({ token: 'nope', requestId: 'req_1', input: { answerText: 'x' } }, db), (e) => e.name === 'NotFoundError')
  await assert.rejects(() => submitPortalRequest({ token: TOKEN, requestId: 'req_2', input: { answerText: 'x' } }, db), (e) => e.name === 'NotFoundError')
  assert.equal(db.state.events.length, 0)
  mock.restoreAll()
})

test('a file answer records the event, without the file location', async () => {
  silence()
  const db = makeDb({ requests: [{ id: 'req_1', status: 'OPEN', type: 'FILE' }] })
  const uploader = async () => ({ url: 'https://files.test/private/brand.pdf', publicId: 'pub_1', bytes: PDF.length })
  const remover = mock.fn(async () => {})

  await submitPortalFileRequest({ token: TOKEN, requestId: 'req_1', file: new File([PDF], 'brand.pdf'), uploader, remover }, db)

  assert.equal(db.state.events.length, 1)
  assert.equal(db.state.events[0].type, 'CLIENT_REQUEST_SUBMITTED')
  assert.equal(db.state.events[0].metadata.requestType, 'FILE')
  assert.ok(!JSON.stringify(db.state.events[0]).includes('files.test'), 'the file URL must not be in an event')
  assert.equal(remover.mock.callCount(), 0)
  mock.restoreAll()
})

test('if the event cannot be saved, the uploaded file is deleted again and the request stays OPEN', async () => {
  silence()
  const db = makeDb({ requests: [{ id: 'req_1', status: 'OPEN', type: 'FILE' }], failActivity: true })
  const uploader = async () => ({ url: 'https://files.test/x.pdf', publicId: 'pub_1', bytes: PDF.length })
  const remover = mock.fn(async () => {})

  await assert.rejects(
    () => submitPortalFileRequest({ token: TOKEN, requestId: 'req_1', file: new File([PDF], 'brand.pdf'), uploader, remover }, db),
    /activity insert failed/
  )
  assert.equal(db.state.requests[0].status, 'OPEN')
  assert.equal(db.state.requests[0].fileUrl, undefined)
  assert.equal(remover.mock.callCount(), 1, 'the orphaned upload must be cleaned up')
  mock.restoreAll()
})