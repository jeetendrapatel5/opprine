// components/dashboard/requests/ClientRequestsPanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The team's side of Client Requests, opened from the project sidebar
// ("Client Requests" button -> ?panel=requests -> ProjectPanelDialog).
//
// WHAT IT DOES
//   1. Shows the "waiting on client" ledger: how many days the project has been
//      blocked on the client, how many items are open, the longest wait.
//   2. Lists requests in three groups:  Needs your review  /  Waiting on client
//      / Closed.
//   3. Lets managers create requests (several at once = ONE email to the
//      client), accept an answer, cancel a request, or change a due date.
//
// DATA FLOW (all through the API routes; this file never touches the database)
//   open dialog  -> GET   /api/projects/:id/requests              { requests, blocked }
//   create       -> POST  /api/projects/:id/requests              { requests, emailSent }
//   accept/cancel/edit -> PATCH /api/projects/:id/requests/:rid   (the updated request)
//   after any change: reload the list, then router.refresh() so server-rendered
//   parts of the page stay in sync.
//
// PERMISSIONS
// The server enforces everything. `permissions` only decides what to SHOW:
//   canViewClientRequests   no -> a "restricted" notice, nothing is fetched
//   canManageClientRequests no -> read-only list (no form, no action buttons)
//
// The dialog content only mounts while the panel is open, so the fetch happens
// when it opens and the data is fresh every time.
// ─────────────────────────────────────────────────────────────────────────────
'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  Lock,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react'
import { SectionHeader } from '@/components/dashboard/panel-ui'

// Keep these in sync with REQUEST_LIMITS in lib/client-request-validation.js.
const BATCH_MAX = 20
const TITLE_MAX = 200
const INSTRUCTIONS_MAX = 2000

const DAY_MS = 24 * 60 * 60 * 1000

const TYPE_LABEL = { TEXT: 'Written answer', APPROVAL: 'Yes / no', FILE: 'File upload' }

// ── helpers ─────────────────────────────────────────────────────────────────

// Due dates are a calendar date stored at 00:00 UTC: format in UTC so nobody
// sees the day before.
const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })

const isOverdue = (dueDate) => new Date(dueDate).getTime() + DAY_MS <= Date.now()
const daysSince = (date) => Math.floor((Date.now() - new Date(date).getTime()) / DAY_MS)
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// "YYYY-MM-DD" for today in the user's timezone: the `min` of the date inputs.
function todayInputValue() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Turns an API error into a sentence for people. The server prefixes
// validation problems with the field path ("requests.0.title: Title is
// required."); show "Request 1: Title is required." instead.
function friendlyError(err) {
  const message = err?.response?.data?.error
  if (typeof message !== 'string' || !message) return 'Something went wrong. Please try again.'
  const item = message.match(/^requests\.(\d+)\.\w+:\s*(.*)$/)
  if (item) return `Request ${Number(item[1]) + 1}: ${item[2]}`
  return message.replace(/^[\w.]+:\s+/, '')
}

const makeDraft = () => ({
  key: Math.random().toString(36).slice(2),
  title: '',
  type: 'TEXT',
  instructions: '',
  dueDate: '',
  blocksWork: true,
})

// ── shared styles (dashboard tokens only) ──────────────────────────────────
const inputClass = `
  w-full bg-fp-raised border border-fp-border text-fp-text-primary text-sm
  rounded-lg px-3 py-2 placeholder:text-fp-text-tertiary [color-scheme:dark]
  focus:outline-none focus:ring-2 focus:ring-fp-accent/20 focus:border-fp-accent/40
  transition-colors duration-150 disabled:opacity-50
`
const primaryButton = `
  inline-flex items-center justify-center gap-1.5 bg-fp-accent text-fp-base
  hover:bg-fp-accent-hover text-xs font-bold px-3.5 py-2 rounded-lg
  transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed
`
const ghostButton = `
  inline-flex items-center justify-center gap-1.5 border border-fp-border
  text-fp-text-secondary hover:text-fp-text-primary hover:border-fp-accent/30
  text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors duration-150
  disabled:opacity-50 disabled:cursor-not-allowed
`
const dangerGhostButton = `
  inline-flex items-center justify-center gap-1.5 border border-fp-border
  text-fp-text-secondary hover:text-fp-danger hover:border-fp-danger/30
  text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors duration-150
  disabled:opacity-50 disabled:cursor-not-allowed
`
const labelClass = 'block text-[10px] font-bold uppercase tracking-widest text-fp-text-tertiary mb-1.5'

// ── The ledger summary ──────────────────────────────────────────────────────
function Ledger({ blocked }) {
  const project = blocked?.project
  if (!project) return null
  const longest =
    project.openBlockingCount > 0 && project.oldestOpenSince ? daysSince(project.oldestOpenSince) : 0

  const stats = [
    { label: 'Blocked on client', value: plural(project.blockedDays, 'day'), hint: 'in total' },
    { label: 'Waiting now', value: String(project.openBlockingCount), hint: 'open items' },
    { label: 'Longest wait', value: plural(longest, 'day'), hint: 'still open' },
  ]

  return (
    <div className="grid grid-cols-3 gap-2 mb-5">
      {stats.map((s) => (
        <div key={s.label} className="bg-fp-raised border border-fp-border rounded-lg px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-fp-text-tertiary">{s.label}</p>
          <p className="mt-1 text-sm font-semibold text-fp-text-primary tabular-nums">{s.value}</p>
          <p className="text-[10px] text-fp-text-tertiary">{s.hint}</p>
        </div>
      ))}
    </div>
  )
}

// ── Create form ─────────────────────────────────────────────────────────────
function NewRequestsForm({ projectId, milestones, onCreated }) {
  const baseId = useId()
  const [milestoneId, setMilestoneId] = useState('')
  const [drafts, setDrafts] = useState(() => [makeDraft()])
  const [notifyClient, setNotifyClient] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const update = (key, patch) =>
    setDrafts((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)))
  const remove = (key) => setDrafts((list) => (list.length > 1 ? list.filter((d) => d.key !== key) : list))

  async function submit(e) {
    e.preventDefault()
    // Rows with no title are ignored (a half-filled extra row shouldn't block sending).
    const items = drafts.filter((d) => d.title.trim())
    if (items.length === 0) {
      setError('Add a title to at least one request.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const { data } = await axios.post(`/api/projects/${projectId}/requests`, {
        milestoneId: milestoneId || null,
        notifyClient,
        requests: items.map((d) => ({
          title: d.title,
          type: d.type,
          instructions: d.instructions || null,
          blocksWork: d.blocksWork,
          dueDate: d.dueDate || null,
        })),
      })
      setDrafts([makeDraft()])
      setMilestoneId('')
      onCreated({ count: items.length, notified: notifyClient, emailSent: Boolean(data?.emailSent) })
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="bg-fp-surface border border-fp-border rounded-xl p-4 mb-6" noValidate>
      <p className="text-xs font-semibold text-fp-text-primary mb-3">Ask your client for something</p>

      {milestones.length > 0 && (
        <div className="mb-3">
          <label htmlFor={`${baseId}-milestone`} className={labelClass}>
            For milestone (optional)
          </label>
          <select
            id={`${baseId}-milestone`}
            value={milestoneId}
            onChange={(e) => setMilestoneId(e.target.value)}
            disabled={submitting}
            className={inputClass}
          >
            <option value="">Whole project</option>
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-3">
        {drafts.map((d, index) => (
          <div key={d.key} className="bg-fp-raised/60 border border-fp-border rounded-lg p-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <input
                aria-label={`Request ${index + 1} title`}
                value={d.title}
                onChange={(e) => update(d.key, { title: e.target.value })}
                maxLength={TITLE_MAX}
                disabled={submitting}
                placeholder="e.g. Your logo files"
                className={inputClass}
              />
              {drafts.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(d.key)}
                  disabled={submitting}
                  aria-label={`Remove request ${index + 1}`}
                  className="shrink-0 p-2 text-fp-text-tertiary hover:text-fp-danger transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <textarea
              aria-label={`Request ${index + 1} instructions`}
              value={d.instructions}
              onChange={(e) => update(d.key, { instructions: e.target.value })}
              maxLength={INSTRUCTIONS_MAX}
              rows={2}
              disabled={submitting}
              placeholder="Anything that helps them answer (optional)"
              className={`${inputClass} resize-none`}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label htmlFor={`${baseId}-${d.key}-type`} className={labelClass}>
                  They will
                </label>
                <select
                  id={`${baseId}-${d.key}-type`}
                  value={d.type}
                  onChange={(e) => update(d.key, { type: e.target.value })}
                  disabled={submitting}
                  className={inputClass}
                >
                  <option value="TEXT">Write an answer</option>
                  <option value="APPROVAL">Approve (yes / no)</option>
                  <option value="FILE">Upload a file</option>
                </select>
              </div>
              <div>
                <label htmlFor={`${baseId}-${d.key}-due`} className={labelClass}>
                  Due date (optional)
                </label>
                <input
                  id={`${baseId}-${d.key}-due`}
                  type="date"
                  min={todayInputValue()}
                  value={d.dueDate}
                  onChange={(e) => update(d.key, { dueDate: e.target.value })}
                  disabled={submitting}
                  className={inputClass}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-fp-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={d.blocksWork}
                onChange={(e) => update(d.key, { blocksWork: e.target.checked })}
                disabled={submitting}
                className="accent-[var(--color-fp-accent)]"
              />
              Blocks my work (counts toward blocked days)
            </label>
          </div>
        ))}
      </div>

      {drafts.length < BATCH_MAX && (
        <button
          type="button"
          onClick={() => setDrafts((list) => [...list, makeDraft()])}
          disabled={submitting}
          className={`${ghostButton} mt-3`}
        >
          <Plus className="w-3.5 h-3.5" />
          Add another
        </button>
      )}

      <div className="mt-4 pt-4 border-t border-fp-border flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-fp-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={notifyClient}
            onChange={(e) => setNotifyClient(e.target.checked)}
            disabled={submitting}
            className="accent-[var(--color-fp-accent)]"
          />
          Email my client about these
        </label>
        <button type="submit" disabled={submitting} className={primaryButton}>
          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Send {drafts.filter((d) => d.title.trim()).length > 1 ? 'requests' : 'request'}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs text-fp-danger">
          {error}
        </p>
      )}
    </form>
  )
}

// ── The file a client uploaded ──────────────────────────────────────────────
// The server only ever stores an https Cloudinary URL here; the check below is
// defence in depth so a bad value can never become a clickable javascript: link.
// Treat the file like an email attachment from a stranger: the server only
// allows documents, images and archives (never executables or HTML), but your
// client is still the one who chose it.
function FileAnswer({ request }) {
  const safeUrl =
    typeof request.fileUrl === 'string' && request.fileUrl.startsWith('https://') ? request.fileUrl : null
  if (!request.fileName && !safeUrl) return <p className="text-xs text-fp-text-tertiary">No file.</p>

  const label = `${request.fileName ?? 'Uploaded file'}${request.fileSize ? ` (${formatSize(request.fileSize)})` : ''}`
  return safeUrl ? (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs font-semibold text-fp-accent hover:text-fp-accent-hover hover:underline break-all"
    >
      {label}
    </a>
  ) : (
    <p className="text-xs text-fp-text-primary break-all">{label}</p>
  )
}

// ── One request ─────────────────────────────────────────────────────────────
function RequestRow({ request, projectId, canManage, onChanged }) {
  const dateId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [dueDate, setDueDate] = useState(request.dueDate ? new Date(request.dueDate).toISOString().slice(0, 10) : '')

  const isOpen = request.status === 'OPEN'
  const isSubmitted = request.status === 'SUBMITTED'
  const overdue = isOpen && request.dueDate ? isOverdue(request.dueDate) : false

  async function patch(body) {
    setBusy(true)
    setError('')
    try {
      await axios.patch(`/api/projects/${projectId}/requests/${request.id}`, body)
      setEditing(false)
      await onChanged()
    } catch (err) {
      setError(friendlyError(err))
      // 409 means the list is stale (e.g. the client just answered): reload it.
      if (err?.response?.status === 409 || err?.response?.status === 404) await onChanged()
    } finally {
      setBusy(false)
    }
  }

  const statusLabel = {
    OPEN: 'Waiting on client',
    SUBMITTED: 'Answered, needs review',
    ACCEPTED: 'Accepted',
    CANCELLED: 'Cancelled',
  }[request.status]

  return (
    <div className="bg-fp-surface border border-fp-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fp-text-primary break-words">{request.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-fp-text-tertiary">
            <span className="px-1.5 py-0.5 rounded bg-fp-raised border border-fp-border">
              {TYPE_LABEL[request.type] ?? request.type}
            </span>
            {request.milestone && <span>{request.milestone.title}</span>}
            {request.dueDate && (
              <span className={overdue ? 'text-fp-danger font-semibold' : ''}>
                {overdue ? 'Overdue, was due' : 'Due'} {formatDate(request.dueDate)}
              </span>
            )}
          </div>
        </div>
        <span
          className={`shrink-0 text-[11px] font-semibold ${
            isSubmitted ? 'text-fp-warning' : request.status === 'ACCEPTED' ? 'text-fp-success' : 'text-fp-text-secondary'
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {request.instructions && (
        <p className="mt-2 text-xs text-fp-text-secondary whitespace-pre-wrap break-words">{request.instructions}</p>
      )}

      {/* The client's answer */}
      {(isSubmitted || request.status === 'ACCEPTED') && (
        <div className="mt-3 bg-fp-raised border border-fp-border rounded-lg px-3 py-2.5">
          {request.type === 'APPROVAL' && (
            <p
              className={`text-xs font-semibold mb-1 ${request.approved ? 'text-fp-success' : 'text-fp-warning'}`}
            >
              {request.approved ? 'Client approved' : 'Client asked for changes'}
            </p>
          )}
          {request.type === 'FILE' ? (
            <FileAnswer request={request} />
          ) : request.answerText ? (
            <p className="text-xs text-fp-text-primary whitespace-pre-wrap break-words">{request.answerText}</p>
          ) : (
            <p className="text-xs text-fp-text-tertiary">No comment.</p>
          )}
          {request.submittedAt && (
            <p className="mt-1 text-[10px] text-fp-text-tertiary">Answered {formatDate(request.submittedAt)}</p>
          )}
        </div>
      )}

      {/* Waiting details */}
      {isOpen && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fp-text-tertiary">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {request.blocksWork
              ? `Waiting ${plural(daysSince(request.createdAt), 'day')}`
              : 'Does not block work'}
          </span>
          <span>{request.firstViewedAt ? `Seen ${formatDate(request.firstViewedAt)}` : 'Not seen yet'}</span>
          {request.remindersSent > 0 && <span>{plural(request.remindersSent, 'reminder')} sent</span>}
        </div>
      )}

      {/* Edit due date */}
      {editing && (
        <div className="mt-3 flex items-end gap-2">
          <div>
            <label htmlFor={dateId} className={labelClass}>
              Due date
            </label>
            <input
              id={dateId}
              type="date"
              min={todayInputValue()}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={busy}
              className={inputClass}
            />
          </div>
          <button
            type="button"
            onClick={() => patch({ action: 'update', dueDate: dueDate || null })}
            disabled={busy}
            className={primaryButton}
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} disabled={busy} className={ghostButton}>
            Cancel
          </button>
        </div>
      )}

      {/* Actions (managers only) */}
      {canManage && (isOpen || isSubmitted) && !editing && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {isSubmitted && (
            <button type="button" onClick={() => patch({ action: 'accept' })} disabled={busy} className={primaryButton}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Accept answer
            </button>
          )}
          {isOpen && (
            <button type="button" onClick={() => setEditing(true)} disabled={busy} className={ghostButton}>
              Change due date
            </button>
          )}
          <button type="button" onClick={() => patch({ action: 'cancel' })} disabled={busy} className={dangerGhostButton}>
            <XCircle className="w-3.5 h-3.5" />
            Cancel request
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-fp-danger">
          {error}
        </p>
      )}
    </div>
  )
}

// ── The panel ───────────────────────────────────────────────────────────────
export default function ClientRequestsPanel({ projectId, milestones = [], hasClient = true, permissions = {} }) {
  const router = useRouter()
  const canView = Boolean(permissions.canViewClientRequests)
  const canManage = Boolean(permissions.canManageClientRequests)

  const [data, setData] = useState(null) // { requests, blocked }
  const [loading, setLoading] = useState(canView)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState(null) // { tone: 'ok' | 'warn', text }
  const mounted = useRef(true)

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`/api/projects/${projectId}/requests`)
      if (!mounted.current) return
      setData(res.data)
      setLoadError('')
    } catch (err) {
      if (mounted.current) setLoadError(friendlyError(err))
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    mounted.current = true
    if (canView) load()
    return () => {
      mounted.current = false
    }
  }, [canView, load])

  // After any change: reload this list, then refresh server-rendered parts of the page.
  const changed = useCallback(async () => {
    await load()
    router.refresh()
  }, [load, router])

  if (!canView) {
    return (
      <div className="flex items-center gap-2 px-1 py-4 text-xs text-fp-text-tertiary">
        <Lock className="w-3.5 h-3.5 shrink-0" />
        Client requests are restricted for your role on this project.
      </div>
    )
  }

  const requests = data?.requests ?? []
  const review = requests.filter((r) => r.status === 'SUBMITTED')
  const waiting = requests.filter((r) => r.status === 'OPEN')
  const closed = requests.filter((r) => r.status === 'ACCEPTED' || r.status === 'CANCELLED')

  const handleCreated = async ({ count, notified, emailSent }) => {
    if (notified && !emailSent) {
      setNotice({
        tone: 'warn',
        text: `${plural(count, 'request')} saved, but the email to your client could not be sent. They will see the requests the next time they open the portal, and reminders will follow.`,
      })
    } else {
      setNotice({
        tone: 'ok',
        text: notified
          ? `${plural(count, 'request')} sent. Your client has been emailed.`
          : `${plural(count, 'request')} saved. Your client has not been emailed.`,
      })
    }
    await changed()
  }

  return (
    <div className="max-h-[75vh] overflow-y-auto pr-1">
      <h2 className="text-sm font-semibold text-fp-text-primary mb-1">Client requests</h2>
      <p className="text-xs text-fp-text-tertiary mb-4">
        Ask your client for answers or approvals. Blocked days count how long you were waiting on them.
      </p>

      {loading && (
        <div className="flex items-center gap-2 py-6 text-xs text-fp-text-tertiary">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading…
        </div>
      )}

      {!loading && loadError && !data && (
        <div className="py-4">
          <p role="alert" className="text-xs text-fp-danger mb-2">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              load()
            }}
            className={ghostButton}
          >
            Try again
          </button>
        </div>
      )}

      {data && (
        <>
          <Ledger blocked={data.blocked} />

          {canManage && !hasClient && (
            <div className="flex items-start gap-2 mb-5 bg-fp-warning/10 border border-fp-warning/30 rounded-lg px-3 py-2.5 text-xs text-fp-text-secondary">
              <AlertTriangle className="w-3.5 h-3.5 text-fp-warning shrink-0 mt-0.5" />
              This project has no client yet, so there is nobody to send requests to. Add a client first.
            </div>
          )}

          {canManage && hasClient && (
            <NewRequestsForm projectId={projectId} milestones={milestones} onCreated={handleCreated} />
          )}

          {notice && (
            <p
              role="status"
              className={`mb-5 text-xs ${notice.tone === 'warn' ? 'text-fp-warning' : 'text-fp-success'}`}
            >
              {notice.text}
            </p>
          )}

          {loadError && <p role="alert" className="mb-4 text-xs text-fp-danger">{loadError}</p>}

          {requests.length === 0 && (
            <p className="text-xs text-fp-text-tertiary py-2">
              Nothing requested yet.{canManage && hasClient ? ' Use the form above to ask your client for something.' : ''}
            </p>
          )}

          {review.length > 0 && (
            <section className="mb-6">
              <SectionHeader title="Needs your review" badge={review.length} />
              <div className="space-y-3">
                {review.map((r) => (
                  <RequestRow key={r.id} request={r} projectId={projectId} canManage={canManage} onChanged={changed} />
                ))}
              </div>
            </section>
          )}

          {waiting.length > 0 && (
            <section className="mb-6">
              <SectionHeader title="Waiting on client" badge={waiting.length} />
              <div className="space-y-3">
                {waiting.map((r) => (
                  <RequestRow key={r.id} request={r} projectId={projectId} canManage={canManage} onChanged={changed} />
                ))}
              </div>
            </section>
          )}

          {closed.length > 0 && (
            <details className="group">
              <summary className="flex items-center gap-1.5 cursor-pointer select-none list-none text-xs font-semibold text-fp-text-secondary hover:text-fp-text-primary mb-3">
                <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                Closed ({closed.length})
              </summary>
              <div className="space-y-3">
                {closed.map((r) => (
                  <RequestRow key={r.id} request={r} projectId={projectId} canManage={canManage} onChanged={changed} />
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  )
}