// lib/client-request-validation.js
//
// ALL input validation for the client-requests feature lives here, so the
// routes stay thin and the rules are in one place. Nothing in this file
// touches the database.
//
// Each schema both CHECKS the input and CLEANS it (trims text, turns empty
// strings into null, collapses newlines out of titles). Code that receives
// the parsed result can trust it completely.
//
// On failure, parseInput() throws a ValidationError, which
// lib/http-errors.js turns into a 400 response with a readable message.

import { z } from 'zod'
import { ValidationError } from './errors.js'

export const REQUEST_LIMITS = Object.freeze({
  TITLE_MAX: 200,
  INSTRUCTIONS_MAX: 2000,
  ANSWER_MAX: 5000,
  BATCH_MAX: 20, // most requests that can be created in one call
})

// The request types staff can create. Matches the RequestType enum in the schema.
export const SUPPORTED_REQUEST_TYPES = ['TEXT', 'APPROVAL', 'FILE']

const MS_PER_DAY = 24 * 60 * 60 * 1000

// A title is one line: collapse every run of whitespace (including
// newlines) into a single space. Titles end up in email subjects.
const title = z
  .string()
  .transform((value) => value.replace(/\s+/g, ' ').trim())
  .pipe(
    z
      .string()
      .min(1, 'Title is required.')
      .max(REQUEST_LIMITS.TITLE_MAX, `Title must be ${REQUEST_LIMITS.TITLE_MAX} characters or fewer.`)
  )

// Optional free text: trimmed; empty / missing / null all become null.
const optionalText = (max, label) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .nullish()
    .transform((value) => value || null)

// A due date is an ISO date string (e.g. "2026-12-01" or a full ISO
// timestamp). Sanity window: not more than a day in the past (a typo like
// 2025 is caught) and not more than two years ahead.
// `Date.now()` is read when the input is parsed, not when this file loads.
const dueDate = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Due date is not a valid date.')
  .transform((value) => new Date(value))
  .refine((date) => date.getTime() >= Date.now() - MS_PER_DAY, 'Due date cannot be in the past.')
  .refine((date) => date.getTime() <= Date.now() + 2 * 365 * MS_PER_DAY, 'Due date is too far in the future.')

// ── Staff: create (one call can create a whole "pack" of requests) ─────────

const requestItem = z.object({
  title,
  instructions: optionalText(REQUEST_LIMITS.INSTRUCTIONS_MAX, 'Instructions'),
  type: z.enum(SUPPORTED_REQUEST_TYPES),
  blocksWork: z.boolean().default(true),
  dueDate: dueDate.nullish().transform((value) => value ?? null),
})

export const createRequestsSchema = z.object({
  milestoneId: z
    .string()
    .trim()
    .min(1)
    .nullish()
    .transform((value) => value ?? null),
  // Email the client about these requests? (One email per call, however many.)
  notifyClient: z.boolean().default(true),
  requests: z.array(requestItem).min(1, 'Add at least one request.').max(
    REQUEST_LIMITS.BATCH_MAX,
    `You can create at most ${REQUEST_LIMITS.BATCH_MAX} requests at a time.`
  ),
})

// ── Staff: accept / cancel / edit ──────────────────────────────────────────
// `action` decides which other fields are allowed. For "update", a field
// that is missing means "leave it alone"; null means "clear it".

export const updateRequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('accept') }),
  z.object({ action: z.literal('cancel') }),
  z
    .object({
      action: z.literal('update'),
      title: title.optional(),
      instructions: z
        .string()
        .trim()
        .max(REQUEST_LIMITS.INSTRUCTIONS_MAX, `Instructions must be ${REQUEST_LIMITS.INSTRUCTIONS_MAX} characters or fewer.`)
        .nullable()
        .optional(),
      dueDate: dueDate.nullable().optional(),
    })
    .refine(
      (value) => value.title !== undefined || value.instructions !== undefined || value.dueDate !== undefined,
      'Nothing to update.'
    ),
])

// ── Portal: the client's answer ────────────────────────────────────────────
// Which schema applies depends on the request's type, which comes from the
// database - so the service picks one with answerSchemaFor().

const textAnswer = z.object({
  answerText: z
    .string()
    .trim()
    .min(1, 'Please write an answer.')
    .max(REQUEST_LIMITS.ANSWER_MAX, `Your answer must be ${REQUEST_LIMITS.ANSWER_MAX} characters or fewer.`),
})

const approvalAnswer = z
  .object({
    approved: z.boolean(),
    answerText: optionalText(REQUEST_LIMITS.ANSWER_MAX, 'Your comment'),
  })
  .refine((value) => value.approved || value.answerText, {
    message: 'Please tell us what to change.',
    path: ['answerText'],
  })

export function answerSchemaFor(type) {
  if (type === 'TEXT') return textAnswer
  if (type === 'APPROVAL') return approvalAnswer
  // FILE requests are answered by uploading a file (the portal upload route),
  // never through this JSON schema.
  throw new ValidationError('Upload a file to answer this request.')
}

// ── Helpers ────────────────────────────────────────────────────────────────

// Runs a schema; on failure throws ValidationError with the FIRST problem,
// prefixed by the field path ("requests.0.title: Title is required.").
export function parseInput(schema, data) {
  const result = schema.safeParse(data)
  if (!result.success) {
    const issue = result.error.issues[0]
    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
    throw new ValidationError(`${path}${issue.message}`)
  }
  return result.data
}

// request.json() throws on a missing/invalid body, which would surface as a
// 500. This turns it into a clean 400.
export async function readJsonBody(request) {
  try {
    return await request.json()
  } catch {
    throw new ValidationError('Request body must be valid JSON.')
  }
}