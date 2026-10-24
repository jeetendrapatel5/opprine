// lib/client-request-validation.test.js
//
// Run with:  node --test lib/client-request-validation.test.js

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  REQUEST_LIMITS,
  createRequestsSchema,
  updateRequestSchema,
  answerSchemaFor,
  parseInput,
} from './client-request-validation.js'

const inDays = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString()
const validItem = (overrides = {}) => ({ title: 'Brand logo', type: 'TEXT', ...overrides })

const failsWith = (fn, pattern) =>
  assert.throws(fn, (err) => err.name === 'ValidationError' && pattern.test(err.message))

// ── create ──────────────────────────────────────────────────────────────────

test('create: minimal valid input gets sensible defaults', () => {
  const out = parseInput(createRequestsSchema, { requests: [validItem()] })
  assert.equal(out.milestoneId, null)
  assert.equal(out.notifyClient, true)
  assert.equal(out.requests[0].blocksWork, true)
  assert.equal(out.requests[0].instructions, null)
  assert.equal(out.requests[0].dueDate, null)
})

test('create: titles are collapsed to one trimmed line', () => {
  const out = parseInput(createRequestsSchema, { requests: [validItem({ title: '  Logo \n\n files\t' })] })
  assert.equal(out.requests[0].title, 'Logo files')
})

test('create: empty / whitespace title is rejected', () => {
  failsWith(() => parseInput(createRequestsSchema, { requests: [validItem({ title: '   ' })] }), /requests\.0\.title/)
})

test('create: over-long title is rejected', () => {
  failsWith(
    () => parseInput(createRequestsSchema, { requests: [validItem({ title: 'x'.repeat(REQUEST_LIMITS.TITLE_MAX + 1) })] }),
    /Title must be/
  )
})

test('create: empty instructions become null, real ones are trimmed', () => {
  assert.equal(parseInput(createRequestsSchema, { requests: [validItem({ instructions: '   ' })] }).requests[0].instructions, null)
  assert.equal(parseInput(createRequestsSchema, { requests: [validItem({ instructions: ' hi ' })] }).requests[0].instructions, 'hi')
})

test('create: FILE is accepted', () => {
  assert.equal(parseInput(createRequestsSchema, { requests: [validItem({ type: 'FILE' })] }).requests[0].type, 'FILE')
})

test('create: unknown type is rejected', () => {
  failsWith(() => parseInput(createRequestsSchema, { requests: [validItem({ type: 'PASSWORD' })] }), /requests\.0\.type/)
})

test('create: empty list and oversized list are rejected', () => {
  failsWith(() => parseInput(createRequestsSchema, { requests: [] }), /at least one/i)
  failsWith(
    () => parseInput(createRequestsSchema, { requests: Array.from({ length: REQUEST_LIMITS.BATCH_MAX + 1 }, () => validItem()) }),
    /at most/i
  )
})

test('create: due date accepts a date-only string and returns a Date', () => {
  const out = parseInput(createRequestsSchema, { requests: [validItem({ dueDate: inDays(5).slice(0, 10) })] })
  assert.ok(out.requests[0].dueDate instanceof Date)
})

test('create: due date rejects garbage, the past, and the far future', () => {
  failsWith(() => parseInput(createRequestsSchema, { requests: [validItem({ dueDate: 'soon' })] }), /not a valid date/)
  failsWith(() => parseInput(createRequestsSchema, { requests: [validItem({ dueDate: inDays(-10) })] }), /in the past/)
  failsWith(() => parseInput(createRequestsSchema, { requests: [validItem({ dueDate: inDays(365 * 3) })] }), /too far/)
})

test('create: explicit null due date is allowed', () => {
  assert.equal(parseInput(createRequestsSchema, { requests: [validItem({ dueDate: null })] }).requests[0].dueDate, null)
})

test('create: a non-boolean blocksWork is rejected', () => {
  failsWith(() => parseInput(createRequestsSchema, { requests: [validItem({ blocksWork: 'yes' })] }), /blocksWork/)
})

test('create: unknown extra fields are stripped, not stored', () => {
  const out = parseInput(createRequestsSchema, { requests: [validItem({ status: 'ACCEPTED', projectId: 'other' })] })
  assert.equal('status' in out.requests[0], false)
  assert.equal('projectId' in out.requests[0], false)
})

test('create: non-object body is rejected', () => {
  failsWith(() => parseInput(createRequestsSchema, null), /./)
  failsWith(() => parseInput(createRequestsSchema, 'hello'), /./)
})

// ── update ──────────────────────────────────────────────────────────────────

test('update: accept and cancel need no other fields', () => {
  assert.equal(parseInput(updateRequestSchema, { action: 'accept' }).action, 'accept')
  assert.equal(parseInput(updateRequestSchema, { action: 'cancel' }).action, 'cancel')
})

test('update: unknown action is rejected', () => {
  failsWith(() => parseInput(updateRequestSchema, { action: 'delete' }), /action/)
  failsWith(() => parseInput(updateRequestSchema, {}), /action/)
})

test('update: needs at least one field to change', () => {
  failsWith(() => parseInput(updateRequestSchema, { action: 'update' }), /Nothing to update/)
})

test('update: missing means "leave alone", null means "clear"', () => {
  const out = parseInput(updateRequestSchema, { action: 'update', dueDate: null })
  assert.equal(out.dueDate, null)
  assert.equal(out.title, undefined)
  assert.equal(out.instructions, undefined)
})

test('update: title is cleaned like on create', () => {
  assert.equal(parseInput(updateRequestSchema, { action: 'update', title: ' a \n b ' }).title, 'a b')
})

// ── portal answers ──────────────────────────────────────────────────────────

test('TEXT answer: required and trimmed', () => {
  assert.equal(parseInput(answerSchemaFor('TEXT'), { answerText: '  hello ' }).answerText, 'hello')
  failsWith(() => parseInput(answerSchemaFor('TEXT'), { answerText: '   ' }), /write an answer/)
  failsWith(() => parseInput(answerSchemaFor('TEXT'), {}), /answerText/)
})

test('TEXT answer: over-long answer is rejected', () => {
  failsWith(
    () => parseInput(answerSchemaFor('TEXT'), { answerText: 'x'.repeat(REQUEST_LIMITS.ANSWER_MAX + 1) }),
    /Your answer must be/
  )
})

test('APPROVAL answer: approving needs no comment', () => {
  const out = parseInput(answerSchemaFor('APPROVAL'), { approved: true })
  assert.equal(out.approved, true)
  assert.equal(out.answerText, null)
})

test('APPROVAL answer: declining REQUIRES a comment', () => {
  failsWith(() => parseInput(answerSchemaFor('APPROVAL'), { approved: false }), /what to change/)
  failsWith(() => parseInput(answerSchemaFor('APPROVAL'), { approved: false, answerText: '  ' }), /what to change/)
  assert.equal(parseInput(answerSchemaFor('APPROVAL'), { approved: false, answerText: 'Use blue' }).answerText, 'Use blue')
})

test('APPROVAL answer: approved must be a real boolean', () => {
  failsWith(() => parseInput(answerSchemaFor('APPROVAL'), { approved: 'true' }), /approved/)
  failsWith(() => parseInput(answerSchemaFor('APPROVAL'), {}), /approved/)
})

test('answerSchemaFor: FILE is never answered through JSON (a clean validation error)', () => {
  failsWith(() => answerSchemaFor('FILE'), /Upload a file/)
})