// lib/github-push.test.js
//
// Run with:  node --test lib/github-push.test.js
// No database needed: recordGithubPush is given a small in-memory fake that
// behaves like the two tables involved (it skips an activity row whose
// project + dedupeKey already exists, exactly like the real unique index).

import test from 'node:test'
import assert from 'node:assert/strict'
import { recordGithubPush } from './github-push.js'

const SHA_1 = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678'
const SHA_2 = 'ffffffffeeeeeeeedddddddccccccccbbbbbbbb'
const commit = (id, extra = {}) => ({ id, url: `https://github.com/acme/site/commit/${id}`, ...extra })

function fakeDb({ failEventInsert = false } = {}) {
  const state = { events: [], updates: [], order: [] }
  const keys = new Set()
  const tx = {
    projectActivity: {
      createMany: async ({ data }) => {
        state.order.push('event')
        if (failEventInsert) throw new Error('event insert failed')
        let count = 0
        for (const row of data) {
          const key = `${row.projectId}|${row.dedupeKey}`
          if (keys.has(key)) continue // the unique index skips it
          keys.add(key)
          state.events.push(row)
          count++
        }
        return { count }
      },
    },
    update: {
      create: async ({ data }) => {
        state.order.push('update')
        state.updates.push(data)
        return { ...data }
      },
    },
  }
  return { state, $transaction: async (fn) => fn(tx) }
}

test('the first delivery creates one Update and one event, linked by id', async () => {
  const db = fakeDb()
  const result = await recordGithubPush(
    { project: { id: 'proj_1' }, commit: commit(SHA_1), summary: 'Contact form now sends emails' },
    db
  )

  assert.equal(result.duplicate, false)
  assert.equal(db.state.updates.length, 1)
  assert.equal(db.state.events.length, 1)

  const [update] = db.state.updates
  const [event] = db.state.events
  assert.equal(event.entityId, update.id)
  assert.equal(update.type, 'AUTO_DEPLOY')
  assert.equal(update.text, 'Contact form now sends emails')
  assert.equal(update.commitSha, SHA_1.slice(0, 7))
  assert.equal(update.commitUrl, `https://github.com/acme/site/commit/${SHA_1}`)
  assert.equal(update.projectId, 'proj_1')
})

test('the event is a client-visible GitHub integration event keyed by the FULL sha', async () => {
  const db = fakeDb()
  await recordGithubPush({ project: { id: 'proj_1' }, commit: commit(SHA_1), summary: 's' }, db)
  const [event] = db.state.events
  assert.equal(event.type, 'GITHUB_PUSH')
  assert.equal(event.actorType, 'INTEGRATION')
  assert.equal(event.actorName, 'GitHub')
  assert.equal(event.actorUserId, null)
  assert.equal(event.visibility, 'CLIENT')
  assert.equal(event.dedupeKey, `github:${SHA_1}`)
  assert.deepEqual(event.metadata, { commitSha: SHA_1.slice(0, 7) })
})

test('the Update and the event share one timestamp', async () => {
  const db = fakeDb()
  await recordGithubPush({ project: { id: 'proj_1' }, commit: commit(SHA_1), summary: 's' }, db)
  assert.equal(db.state.updates[0].createdAt.getTime(), db.state.events[0].occurredAt.getTime())
})

test('a re-delivered push creates NOTHING the second time', async () => {
  const db = fakeDb()
  const args = { project: { id: 'proj_1' }, commit: commit(SHA_1), summary: 'same push' }

  const first = await recordGithubPush(args, db)
  const second = await recordGithubPush(args, db)
  const third = await recordGithubPush(args, db)

  assert.equal(first.duplicate, false)
  assert.equal(second.duplicate, true)
  assert.equal(third.duplicate, true)
  assert.equal(db.state.updates.length, 1)
  assert.equal(db.state.events.length, 1)
})

test('a different commit is a new push', async () => {
  const db = fakeDb()
  await recordGithubPush({ project: { id: 'proj_1' }, commit: commit(SHA_1), summary: 'one' }, db)
  const second = await recordGithubPush({ project: { id: 'proj_1' }, commit: commit(SHA_2), summary: 'two' }, db)
  assert.equal(second.duplicate, false)
  assert.equal(db.state.updates.length, 2)
  assert.equal(db.state.events.length, 2)
})

test('the same commit on a DIFFERENT project is recorded for both (keys are per project)', async () => {
  const db = fakeDb()
  await recordGithubPush({ project: { id: 'proj_1' }, commit: commit(SHA_1), summary: 's' }, db)
  const other = await recordGithubPush({ project: { id: 'proj_2' }, commit: commit(SHA_1), summary: 's' }, db)
  assert.equal(other.duplicate, false)
  assert.equal(db.state.updates.length, 2)
})

test('the event is claimed BEFORE the Update is created (that is what makes duplicates safe)', async () => {
  const db = fakeDb()
  await recordGithubPush({ project: { id: 'proj_1' }, commit: commit(SHA_1), summary: 's' }, db)
  assert.deepEqual(db.state.order, ['event', 'update'])
})

test('if the event cannot be saved, no Update is created', async () => {
  const db = fakeDb({ failEventInsert: true })
  await assert.rejects(
    () => recordGithubPush({ project: { id: 'proj_1' }, commit: commit(SHA_1), summary: 's' }, db),
    /event insert failed/
  )
  assert.equal(db.state.updates.length, 0)
})

test('a payload without a commit id is rejected before touching the database', async () => {
  const db = fakeDb()
  for (const bad of [undefined, {}, { id: '' }, { id: 123 }]) {
    await assert.rejects(() => recordGithubPush({ project: { id: 'proj_1' }, commit: bad, summary: 's' }, db), /no commit id/)
  }
  assert.deepEqual(db.state.order, [])
})