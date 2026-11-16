// components/portal/ClientRequests.jsx
// "Needs your input": what the team needs FROM the client, answered inline.
// No login: the magic-link token in the URL is the client's only credential.
//
// Data flow
//   page.jsx (server) -> listPortalRequests(token) -> props: requests, blocked
//   client answers    -> POST /api/portal/:token/requests/:id
//                     -> router.refresh() re-runs page.jsx, so the request moves
//                        from "Needs your input" to "Answered"
//
// The server decides what the client may see and what is valid; the checks
// here only give instant feedback.
//
// Request types
//   TEXT      the client types an answer
//   APPROVAL  approve, or ask for changes (a comment is required)
//   FILE      upload a file (POST .../requests/:id/upload, multipart)
'use client'

import { useId, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import { CalendarClock, CheckCircle2, ChevronDown, ClipboardList, Clock, Upload, XCircle } from 'lucide-react'
import { daysSince, formatDueDate, formatSize, isOverdue, plural } from '@/components/dashboard/requests/request-format'
import { Badge, Button, Card, CardBody, CardHeader, FieldLabel, controlClass, focusRing } from './ui'

// Keep in sync with REQUEST_LIMITS.ANSWER_MAX in lib/client-request-validation.js
const ANSWER_MAX = 5000

// Keep in sync with FILE_LIMITS and the allowlist in lib/client-request-files.js.
// The SERVER checks size, type and real content again; these checks only give
// instant feedback before a slow upload.
const FILE_MAX_BYTES = 4 * 1024 * 1024
const FILE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'zip', 'docx', 'xlsx', 'pptx', 'doc', 'xls', 'txt', 'csv']
const FILE_ACCEPT = FILE_EXTENSIONS.map((ext) => `.${ext}`).join(',')

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

// The server writes validation messages for people ("Please write an answer.")
// but prefixes the field name ("answerText: ..."). Drop that prefix here.
function errorMessage(err) {
  const message = err?.response?.data?.error
  if (typeof message === 'string' && message) return message.replace(/^[\w.]+:\s+/, '')
  return 'Something went wrong. Please try again.'
}

function fileErrorMessage(err) {
  // Vercel itself answers 413 (not our JSON) when the body is over its limit.
  if (err?.response?.status === 413) return 'That file is too large. The maximum is 4 MB.'
  return errorMessage(err)
}

const fileInputClass =
  'block w-full text-sm text-fp-portal-text-secondary disabled:opacity-60 ' +
  'file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-fp-portal-border file:bg-fp-portal-surface ' +
  'file:px-3.5 file:py-2 file:text-sm file:font-semibold file:text-fp-portal-text-primary hover:file:bg-fp-portal-raised'

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
    <li className="rounded-xl border border-fp-portal-border bg-fp-portal-bg p-4 sm:p-5">
      <h3 className="break-words text-base font-semibold leading-snug text-fp-portal-text-primary">{request.title}</h3>

      {request.instructions && (
        <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-fp-portal-text-secondary">
          {request.instructions}
        </p>
      )}

      {(request.milestone || request.dueDate) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {request.milestone && <Badge tone="neutral" className="bg-fp-portal-surface ring-1 ring-fp-portal-border">For: {request.milestone.title}</Badge>}
          {request.dueDate && (
            <Badge tone={overdue ? 'danger' : 'neutral'} className={overdue ? '' : 'bg-fp-portal-surface ring-1 ring-fp-portal-border'}>
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              {overdue ? 'Was due' : 'Due'} {formatDueDate(request.dueDate)}
            </Badge>
          )}
        </div>
      )}

      {done ? (
        <p role="status" className="mt-4 flex items-center gap-2 border-t border-fp-portal-border pt-4 text-sm font-semibold text-fp-portal-success">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Sent. Thank you!
        </p>
      ) : (
        <div className="mt-4 border-t border-fp-portal-border pt-4">
          {/* FILE: choose a file, then upload it */}
          {isFile && (
            <>
              <FieldLabel htmlFor={fieldId}>Your file</FieldLabel>
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
              <p className="mt-2 text-xs text-fp-portal-text-muted">
                Up to 4 MB. Images, PDF, ZIP, Word, Excel, PowerPoint, text or CSV.
              </p>
              <div className="mt-3 flex min-w-0 flex-wrap items-center gap-3">
                <Button variant="primary" icon={Upload} loading={submitting} disabled={!file} onClick={sendFile}>
                  Upload file
                </Button>
                {file && !submitting && (
                  <span className="min-w-0 truncate text-xs text-fp-portal-text-muted">
                    {file.name} ({formatSize(file.size)})
                  </span>
                )}
              </div>
            </>
          )}

          {/* TEXT, or the "request changes" comment box of an APPROVAL */}
          {!isFile && (!isApproval || declining) && (
            <>
              <FieldLabel htmlFor={fieldId}>{isApproval ? 'What needs to change?' : 'Your answer'}</FieldLabel>
              <textarea
                id={fieldId}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={ANSWER_MAX}
                rows={4}
                disabled={submitting}
                placeholder={isApproval ? 'e.g. Please use our navy blue instead.' : 'Type your answer here…'}
                className={controlClass}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  loading={submitting}
                  disabled={!canSend}
                  onClick={() => send(isApproval ? { approved: false, answerText: text } : { answerText: text })}
                >
                  {isApproval ? 'Send feedback' : 'Send answer'}
                </Button>
                {isApproval && (
                  <Button
                    variant="ghost"
                    disabled={submitting}
                    onClick={() => {
                      setDeclining(false)
                      setText('')
                      setError('')
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </>
          )}

          {/* APPROVAL: the two choices */}
          {isApproval && !declining && (
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button icon={XCircle} disabled={submitting} onClick={() => setDeclining(true)}>
                Request changes
              </Button>
              <Button variant="success" icon={CheckCircle2} loading={submitting} onClick={() => send({ approved: true })}>
                Approve
              </Button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-fp-portal-danger">
          {error}
        </p>
      )}
    </li>
  )
}

// ── One answered request (read-only) ────────────────────────────────────────
function AnsweredRow({ request }) {
  const accepted = request.status === 'ACCEPTED'
  const choice =
    request.type === 'APPROVAL' ? (request.approved ? 'You approved' : 'You asked for changes') : null

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 break-words text-sm font-medium text-fp-portal-text-primary">{request.title}</p>
        <Badge tone={accepted ? 'success' : 'neutral'}>{accepted ? 'Accepted' : 'Sent, awaiting review'}</Badge>
      </div>
      {choice && <p className="mt-1 text-sm text-fp-portal-text-secondary">{choice}</p>}
      {request.type === 'FILE' && request.fileName && (
        <p className="mt-1 break-words text-sm text-fp-portal-text-secondary">
          Uploaded: {request.fileName}
          {request.fileSize ? ` (${formatSize(request.fileSize)})` : ''}
        </p>
      )}
      {request.answerText && (
        <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-sm text-fp-portal-text-muted">
          {request.answerText}
        </p>
      )}
    </li>
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
    <Card as="section" id="requests" aria-labelledby="requests-title" className="scroll-mt-28 md:scroll-mt-20">
      <CardHeader
        icon={ClipboardList}
        titleId="requests-title"
        title={open.length > 0 ? 'Needs your input' : 'Requests'}
        badge={open.length > 0 ? <Badge tone="accent">{open.length}</Badge> : null}
        aside={
          waitingDays >= 1 && (
            <span className="flex shrink-0 items-center gap-1.5 pt-1 text-xs text-fp-portal-text-muted">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Waiting {plural(waitingDays, 'day')}
            </span>
          )
        }
      />

      <CardBody>
        {open.length > 0 ? (
          <ul className="space-y-4">
            {open.map((request) => (
              <RequestCard key={request.id} request={request} token={token} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fp-portal-text-secondary">You&apos;re all caught up. Thank you!</p>
        )}

        {answered.length > 0 && (
          <details className="group mt-5 border-t border-fp-portal-border pt-4">
            <summary
              className={`flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-lg text-sm font-semibold text-fp-portal-text-secondary hover:text-fp-portal-text-primary [&::-webkit-details-marker]:hidden ${focusRing}`}
            >
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
              Answered ({answered.length})
            </summary>
            <ul className="mt-3 divide-y divide-fp-portal-border">
              {answered.map((request) => (
                <AnsweredRow key={request.id} request={request} />
              ))}
            </ul>
          </details>
        )}
      </CardBody>
    </Card>
  )
}
