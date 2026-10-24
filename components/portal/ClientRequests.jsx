// components/portal/ClientRequests.jsx
// ─────────────────────────────────────────────────────────────────────────────
// "Waiting on you" — the things the team needs FROM the client, with the form
// to answer each one right here. No login: the magic-link token in the URL is
// the client's only credential, same as ActionPanel.
//
// DATA FLOW
//   page.jsx (server) -> listPortalRequests(token) -> props: requests, blocked
//   client answers    -> POST /api/portal/:token/requests/:id
//                     -> router.refresh() re-runs page.jsx, so the answered
//                        request moves from "Needs your input" to "Answered"
//
// The server only sends what the client may see (no internal flags, no
// cancelled requests), and decides what is valid: this component's checks are
// for convenience, never for security.
//
// Three request types:
//   TEXT      - the client types an answer
//   APPROVAL  - the client approves, or asks for changes (a comment is required)
//   FILE      - the client uploads a file (POST .../requests/:id/upload, multipart)
//
// Styling: only existing fp-portal-* tokens, same patterns as ActionPanel.
// ─────────────────────────────────────────────────────────────────────────────
'use client'

import { useId, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import { ClipboardList, CheckCircle2, XCircle, Loader2, Clock, ChevronDown, Upload } from 'lucide-react'

const DAY_MS = 24 * 60 * 60 * 1000

// Keep in sync with REQUEST_LIMITS.ANSWER_MAX in lib/client-request-validation.js
const ANSWER_MAX = 5000

// Keep in sync with FILE_LIMITS and the allowlist in lib/client-request-files.js.
// The SERVER checks size, type and real content again; these checks only give
// the client instant feedback before a slow upload.
const FILE_MAX_BYTES = 4 * 1024 * 1024
const FILE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'zip', 'docx', 'xlsx', 'pptx', 'doc', 'xls', 'txt', 'csv']
const FILE_ACCEPT = FILE_EXTENSIONS.map((ext) => `.${ext}`).join(',')

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// '' when the file looks fine, otherwise a sentence for the client.
function checkFile(file) {
  if (!file) return 'Please choose a file.'
  if (file.size === 0) return 'That file is empty.'
  if (file.size > FILE_MAX_BYTES) return 'That file is too large. The maximum is 4 MB.'
  const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : ''
  if (!FILE_EXTENSIONS.includes(ext)) {
    return 'This file type is not allowed. You can upload images, PDF, ZIP, Word, Excel, PowerPoint, text or CSV files.'
  }
  return ''
}

// Due dates are stored as a calendar date at 00:00 UTC, so format in UTC;
// otherwise a visitor west of UTC would see the day before.
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

// Overdue once the due DATE has fully passed (same rule as the emails).
const isOverdue = (dueDate) => new Date(dueDate).getTime() + DAY_MS <= Date.now()

const daysSince = (date) => Math.floor((Date.now() - new Date(date).getTime()) / DAY_MS)

// The server writes validation messages for people ("Please write an answer.")
// but prefixes the field name ("answerText: ..."). Drop that prefix here.
function errorMessage(err) {
  const message = err?.response?.data?.error
  if (typeof message === 'string' && message) return message.replace(/^[\w.]+:\s+/, '')
  return 'Something went wrong. Please try again.'
}

const fileInputClass = `
  block w-full text-xs text-fp-portal-text-secondary
  file:mr-3 file:rounded-lg file:border-0 file:bg-fp-portal-raised
  file:px-3 file:py-2 file:text-xs file:font-semibold file:text-fp-portal-text-primary
  hover:file:bg-fp-portal-border/40 disabled:opacity-50
`

function fileErrorMessage(err) {
  // Vercel itself answers 413 (not our JSON) when the body is over its limit.
  if (err?.response?.status === 413) return 'That file is too large. The maximum is 4 MB.'
  return errorMessage(err)
}

const primaryButton = `
  flex items-center gap-1.5
  bg-fp-portal-success hover:bg-fp-portal-success/80
  text-white text-xs font-bold px-3 py-2 rounded-lg
  transition-colors duration-150 disabled:opacity-50
`

const ghostButton = `
  flex items-center gap-1.5
  border border-fp-portal-border text-fp-portal-text-secondary
  text-xs font-semibold px-3 py-2 rounded-lg
  hover:border-fp-portal-danger/30 hover:text-fp-portal-danger
  transition-colors duration-150 disabled:opacity-50
`

const textareaClass = `
  w-full bg-fp-portal-raised border border-fp-portal-border
  text-fp-portal-text-primary text-sm rounded-lg px-3 py-2.5
  placeholder:text-fp-portal-text-tertiary resize-none
  focus:outline-none focus:ring-2 focus:ring-fp-portal-accent/20
  focus:border-fp-portal-accent/40 transition-colors duration-150
`

// ── One open request, with its answer form ──────────────────────────────────
function RequestCard({ request, token }) {
  const router = useRouter()
  const fieldId = useId()

  const [text, setText] = useState('')
  const [file, setFile] = useState(null) // FILE requests: the chosen File
  const [declining, setDeclining] = useState(false) // APPROVAL: "Request changes" form open
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const isApproval = request.type === 'APPROVAL'
  const isFile = request.type === 'FILE'
  const overdue = request.dueDate ? isOverdue(request.dueDate) : false

  async function send(payload) {
    setSubmitting(true)
    setError('')
    try {
      await axios.post(`/api/portal/${token}/requests/${request.id}`, payload)
      setDone(true)
      router.refresh()
    } catch (err) {
      setError(errorMessage(err))
      // 409 = already answered (e.g. in another tab), 404 = withdrawn. Either
      // way our copy is out of date: refresh so the page shows the truth.
      const status = err?.response?.status
      if (status === 409 || status === 404) router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  async function sendFile() {
    if (!file || submitting) return
    const problem = checkFile(file)
    if (problem) {
      setError(problem)
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const body = new FormData()
      body.append('file', file)
      await axios.post(`/api/portal/${token}/requests/${request.id}/upload`, body)
      setDone(true)
      router.refresh()
    } catch (err) {
      setError(fileErrorMessage(err))
      const status = err?.response?.status
      if (status === 409 || status === 404) router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  const canSend = text.trim().length > 0 && !submitting

  return (
    <div className="bg-fp-portal-surface border border-fp-portal-border rounded-xl p-4">
      <p className="text-fp-portal-text-primary text-sm font-semibold leading-snug break-words">
        {request.title}
      </p>

      {request.instructions && (
        <p className="mt-1 text-xs text-fp-portal-text-secondary leading-relaxed whitespace-pre-wrap break-words">
          {request.instructions}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fp-portal-text-tertiary">
        {request.milestone && <span>For: {request.milestone.title}</span>}
        {request.dueDate && (
          <span className={overdue ? 'text-fp-portal-danger font-semibold' : ''}>
            {overdue ? 'Was due' : 'Due'} {formatDate(request.dueDate)}
          </span>
        )}
      </div>

      {done ? (
        <p className="mt-4 pt-4 border-t border-fp-portal-border flex items-center gap-1.5 text-xs font-semibold text-fp-portal-success">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Sent. Thank you!
        </p>
      ) : (
        <div className="mt-4 pt-4 border-t border-fp-portal-border">
          {/* FILE: choose a file, then upload it */}
          {isFile && (
            <>
              <label
                htmlFor={fieldId}
                className="block text-[10px] font-bold uppercase tracking-widest text-fp-portal-text-tertiary mb-2"
              >
                Your file
              </label>
              <input
                id={fieldId}
                type="file"
                accept={FILE_ACCEPT}
                disabled={submitting}
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null)
                  setError('')
                }}
                className={fileInputClass}
              />
              <p className="mt-1.5 text-[11px] text-fp-portal-text-tertiary">
                Up to 4 MB. Images, PDF, ZIP, Word, Excel, PowerPoint, text or CSV.
              </p>
              <div className="mt-2 flex items-center gap-2 min-w-0">
                <button type="button" onClick={sendFile} disabled={!file || submitting} className={primaryButton}>
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Upload file
                </button>
                {file && !submitting && (
                  <span className="text-[11px] text-fp-portal-text-tertiary truncate">
                    {file.name} ({formatSize(file.size)})
                  </span>
                )}
              </div>
            </>
          )}

          {/* TEXT, or the "request changes" comment box of an APPROVAL */}
          {!isFile && (!isApproval || declining) && (
            <>
              <label
                htmlFor={fieldId}
                className="block text-[10px] font-bold uppercase tracking-widest text-fp-portal-text-tertiary mb-2"
              >
                {isApproval ? 'What needs to change?' : 'Your answer'}
              </label>
              <textarea
                id={fieldId}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={ANSWER_MAX}
                rows={3}
                disabled={submitting}
                placeholder={
                  isApproval
                    ? 'e.g. Please use our navy blue instead.'
                    : 'Type your answer here…'
                }
                className={textareaClass}
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    send(isApproval ? { approved: false, answerText: text } : { answerText: text })
                  }
                  disabled={!canSend}
                  className={isApproval ? ghostButton : primaryButton}
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isApproval ? 'Send feedback' : 'Send answer'}
                </button>
                {isApproval && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeclining(false)
                      setText('')
                      setError('')
                    }}
                    disabled={submitting}
                    className="text-xs font-semibold text-fp-portal-text-tertiary hover:text-fp-portal-text-secondary disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </>
          )}

          {/* APPROVAL: the two choices */}
          {isApproval && !declining && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDeclining(true)}
                disabled={submitting}
                className={ghostButton}
              >
                <XCircle className="w-3.5 h-3.5" />
                Request changes
              </button>
              <button
                type="button"
                onClick={() => send({ approved: true })}
                disabled={submitting}
                className={primaryButton}
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Approve
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-fp-portal-danger">
          {error}
        </p>
      )}
    </div>
  )
}

// ── One answered request (read-only) ────────────────────────────────────────
function AnsweredRow({ request }) {
  const status = request.status === 'ACCEPTED' ? 'Accepted' : 'Sent, awaiting review'
  const choice =
    request.type === 'APPROVAL' ? (request.approved ? 'You approved' : 'You asked for changes') : null

  return (
    <div className="py-2.5 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-fp-portal-text-primary break-words min-w-0">{request.title}</p>
        <span className="shrink-0 text-[11px] font-semibold text-fp-portal-success">{status}</span>
      </div>
      {choice && <p className="text-xs text-fp-portal-text-secondary mt-0.5">{choice}</p>}
      {request.type === 'FILE' && request.fileName && (
        <p className="text-xs text-fp-portal-text-secondary mt-0.5 break-words">
          Uploaded: {request.fileName}
          {request.fileSize ? ` (${formatSize(request.fileSize)})` : ''}
        </p>
      )}
      {request.answerText && (
        <p className="mt-0.5 text-xs text-fp-portal-text-tertiary whitespace-pre-wrap break-words line-clamp-3">
          {request.answerText}
        </p>
      )}
    </div>
  )
}

export default function ClientRequests({ requests, blocked, token }) {
  const open = requests.filter((r) => r.status === 'OPEN')
  const answered = requests.filter((r) => r.status !== 'OPEN')

  // Nothing was ever asked: render nothing, so existing portals look unchanged.
  if (requests.length === 0) return null

  // "Waiting N days" describes the CURRENT wait (oldest blocking item still
  // open), not the project's lifetime total, so it never overstates things.
  const waitingDays =
    blocked?.openBlockingCount > 0 && blocked.oldestOpenSince ? daysSince(blocked.oldestOpenSince) : 0

  return (
    <div className="bg-fp-portal-surface border border-fp-portal-border rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <ClipboardList className="w-4 h-4 text-fp-portal-accent shrink-0" />
          <h2 className="text-fp-portal-text-primary text-sm font-semibold">
            {open.length > 0 ? 'Needs your input' : 'Requests'}
          </h2>
          {open.length > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-fp-portal-accent/10 text-fp-portal-accent">
              {open.length}
            </span>
          )}
        </div>

        {waitingDays >= 1 && (
          <span className="shrink-0 flex items-center gap-1 text-[11px] text-fp-portal-text-tertiary">
            <Clock className="w-3 h-3" />
            Waiting {waitingDays} {waitingDays === 1 ? 'day' : 'days'}
          </span>
        )}
      </div>

      {open.length > 0 ? (
        <div className="space-y-3">
          {open.map((request) => (
            <RequestCard key={request.id} request={request} token={token} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-fp-portal-text-secondary">
          You&apos;re all caught up. Thank you!
        </p>
      )}

      {answered.length > 0 && (
        <details className="group mt-4 pt-4 border-t border-fp-portal-border">
          <summary className="flex items-center gap-1.5 cursor-pointer select-none list-none text-xs font-semibold text-fp-portal-text-secondary hover:text-fp-portal-text-primary">
            <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
            Answered ({answered.length})
          </summary>
          <div className="mt-3 divide-y divide-fp-portal-border">
            {answered.map((request) => (
              <AnsweredRow key={request.id} request={request} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}