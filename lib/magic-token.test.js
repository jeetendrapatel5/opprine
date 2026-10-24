// lib/magic-token.test.js
//
// Run with:  node --test lib/magic-token.test.js

import test from 'node:test'
import assert from 'node:assert/strict'
import { generateMagicToken, isLegacyMagicToken, rotateLegacyMagicTokens } from './magic-token.js'

const CUID = 'clx9k2m4n0000abcd1234efgh' // the shape of an old token: "c" + 24 lowercase letters/digits

test('generateMagicToken: 43 URL-safe characters (256 bits), never legacy-shaped, never repeats', () => {
  const seen = new Set()
  for (let i = 0; i < 2000; i++) {
    const t = generateMagicToken()
    assert.match(t, /^[A-Za-z0-9_-]{43}$/)
    assert.equal(isLegacyMagicToken(t), false)
    seen.add(t)
  }
  assert.equal(seen.size, 2000)
})

test('isLegacyMagicToken recognises only the old cuid shape', () => {
  assert.equal(isLegacyMagicToken(CUID), true)
  for (const not of ['', null, undefined, 42, 'c' + 'a'.repeat(23), 'c' + 'a'.repeat(25), 'C' + 'a'.repeat(24), '550e8400-e29b-41d4-a716-446655440000', generateMagicToken()])
    assert.equal(isLegacyMagicToken(not), false, String(not))
})

function fakeDb(rows) {
  const db = {
    updates: 0,
    client: {
      findMany: async ({ where }) => rows.filter((r) => !where.projectId || r.projectId === where.projectId).map((r) => ({ ...r })),
      updateMany: async ({ where, data }) => {
        const row = rows.find((r) => r.id === where.id && r.magicToken === where.magicToken)
        if (!row) return { count: 0 }
        row.magicToken = data.magicToken; db.updates++
        return { count: 1 }
      },
    },
  }
  return db
}
const rows = () => [
  { id: 'c1', email: 'a@x.test', magicToken: CUID, projectId: 'p1', project: { name: 'One' } },
  { id: 'c2', email: 'b@x.test', magicToken: generateMagicToken(), projectId: 'p2', project: { name: 'Two' } },
  { id: 'c3', email: 'c@x.test', magicToken: 'cabcdefghijklmnopqrstuvwx', projectId: 'p3', project: { name: 'Three' } },
]

test('rotate: dry run counts but changes nothing', async () => {
  const data = rows(), db = fakeDb(data), before = data.map((r) => r.magicToken)
  const out = await rotateLegacyMagicTokens({ db })
  assert.deepEqual([out.total, out.legacy, out.rotated.length], [3, 2, 0]); assert.equal(db.updates, 0)
  assert.deepEqual(data.map((r) => r.magicToken), before)
})
test('rotate --apply: only legacy tokens change, new ones are strong, results list the new links data', async () => {
  const data = rows(), db = fakeDb(data), strong = data[1].magicToken
  const out = await rotateLegacyMagicTokens({ db, apply: true })
  assert.equal(out.rotated.length, 2); assert.equal(out.skipped, 0)
  assert.equal(data[1].magicToken, strong)
  for (const r of [data[0], data[2]]) assert.match(r.magicToken, /^[A-Za-z0-9_-]{43}$/)
  assert.deepEqual(out.rotated.map((r) => [r.projectName, r.clientEmail]), [['One', 'a@x.test'], ['Three', 'c@x.test']])
  assert.equal(out.rotated[0].token, data[0].magicToken)
  assert.equal((await rotateLegacyMagicTokens({ db, apply: true })).legacy, 0) // second run finds nothing
})
test('rotate: limited to one project; a token that changed meanwhile is skipped, never overwritten', async () => {
  const data = rows(), db = fakeDb(data)
  const out = await rotateLegacyMagicTokens({ db, apply: true, projectId: 'p1' })
  assert.equal(out.total, 1); assert.equal(out.rotated.length, 1); assert.equal(isLegacyMagicToken(data[2].magicToken), true)
  const racing = fakeDb(rows()); const orig = racing.client.updateMany
  racing.client.updateMany = async (a) => orig({ ...a, where: { ...a.where, magicToken: 'changed-elsewhere' } })
  const r = await rotateLegacyMagicTokens({ db: racing, apply: true })
  assert.equal(r.rotated.length, 0); assert.equal(r.skipped, 2)
})