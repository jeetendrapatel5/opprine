// components/dashboard/requests/RequestRow.jsx
// One request: a compact summary line that expands to its details and actions.
// Requests waiting for your review start expanded.
//
// PERMISSIONS: `canManage` only decides what to SHOW. The API enforces it.

'use client'

import { useId, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Paperclip,
  Pencil,
  ThumbsUp,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUpdateClientRequest } from '@/hooks/useClientRequests'
import RequestEditor from './RequestEditor'
import { ActionButton, StatusBadge, labelClass } from './request-ui'
import {
  TYPE_LABEL,
  daysSince,
  formatDate,
  formatDueDate,
  formatSize,
  friendlyError,
  isOverdue,
  plural,
} from './request-format'

function Detail({ label, children }) {
  return (
    <div>
      <p className={labelClass}>{label}</p>
      {children}
    </div>
  )
}

// The server only stores an https Cloudinary URL here; the check below is
// defence in depth so a bad value can never become a clickable javascript: link.
// The file still comes from your client, so open it like any email attachment.
function FileAnswer({ request }) {
  const safeUrl =
    typeof request.fileUrl === 'string' && request.fileUrl.startsWith('https://') ? request.fileUrl : null
  if (!request.fileName && !safeUrl) return <p className="text-xs text-fp-text-secondary">No file.</p>

  const label = `${request.fileName ?? 'Uploaded file'}${request.fileSize ? ` (${formatSize(request.fileSize)})` : ''}`
  const content = (
    <>
      <Paperclip className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="break-all">{label}</span>
    </>
  )

  return safeUrl ? (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-start gap-1.5 text-xs font-medium text-fp-accent hover:text-fp-accent-hover hover:underline"
    >
      {content}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  ) : (
    <p className="inline-flex items-start gap-1.5 text-xs text-fp-text-primary">{content}</p>
  )
}

function Answer({ request }) {
  const isApproval = request.type === 'APPROVAL'
  return (
    <div className="rounded-lg border border-fp-border bg-fp-raised px-3 py-2.5">
      <p className={labelClass}>Client&rsquo;s answer</p>
      {isApproval && (
        <p
          className={cn(
            'mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold',
            request.approved ? 'text-fp-success' : 'text-fp-warning'
          )}
        >
          {request.approved ? (
            <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {request.approved ? 'Approved' : 'Asked for changes'}
        </p>
      )}
      {request.type === 'FILE' ? (
        <FileAnswer request={request} />
      ) : request.answerText ? (
        <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-fp-text-primary">
          {request.answerText}
        </p>
      ) : (
        <p className="text-xs text-fp-text-secondary">No comment.</p>
      )}
      {request.submittedAt && (
        <p className="mt-2 text-[11px] text-fp-text-secondary">Answered {formatDate(request.submittedAt)}</p>
      )}
    </div>
  )
}

// What happened to the request, in one line.
function Timeline({ request }) {
  let items = []
  if (request.status === 'OPEN') {
    items = [
      request.blocksWork ? `Waiting ${plural(daysSince(request.createdAt), 'day')}` : 'Does not block your work',
      request.firstViewedAt ? `Seen ${formatDate(request.firstViewedAt)}` : 'Not seen yet',
    ]
    if (request.remindersSent > 0) items.push(`${plural(request.remindersSent, 'reminder')} sent`)
  } else if (request.status === 'ACCEPTED' && request.acceptedAt) {
    items = [`Accepted ${formatDate(request.acceptedAt)}`]
  } else if (request.status === 'CANCELLED' && request.cancelledAt) {
    items = [`Cancelled ${formatDate(request.cancelledAt)}`]
  }
  if (items.length === 0) return null

  return <p className="text-[11px] text-fp-text-secondary">{items.join(' · ')}</p>
}

export default function RequestRow({ request, projectId, canManage }) {
  const detailId = useId()
  const headerRef = useRef(null)
  const update = useUpdateClientRequest(projectId)
  const [open, setOpen] = useState(request.status === 'SUBMITTED')
  const [mode, setMode] = useState('view') // 'view' | 'edit' | 'confirm-cancel'

  const isOpen = request.status === 'OPEN'
  const isSubmitted = request.status === 'SUBMITTED'
  const isCancelled = request.status === 'CANCELLED'
  const overdue = isOpen && request.dueDate ? isOverdue(request.dueDate) : false
  const busy = update.isPending
  const error = update.isError ? friendlyError(update.error) : ''

  // A new mode starts clean, without the previous attempt's error.
  function goTo(nextMode) {
    update.reset()
    setMode(nextMode)
  }

  // Back to the plain view; focus returns to the row so keyboard users keep their place.
  function backToView() {
    goTo('view')
    headerRef.current?.focus()
  }

  function run(body) {
    update.mutate({ requestId: request.id, body }, { onSuccess: () => setMode('view') })
  }

  return (
    <li>
      <button
        ref={headerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={open ? detailId : undefined}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-fp-raised/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fp-accent/40"
      >
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block text-sm font-medium [overflow-wrap:anywhere]',
              isCancelled ? 'text-fp-text-secondary' : 'text-fp-text-primary'
            )}
          >
            {request.title}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fp-text-secondary">
            <StatusBadge status={request.status} />
            <span>{TYPE_LABEL[request.type] ?? request.type}</span>
            {request.milestone && (
              <span className="max-w-full truncate">{request.milestone.title}</span>
            )}
            {request.dueDate &&
              (overdue ? (
                <span className="inline-flex items-center gap-1 font-semibold text-fp-danger">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  Overdue, due {formatDueDate(request.dueDate)}
                </span>
              ) : (
                <span>Due {formatDueDate(request.dueDate)}</span>
              ))}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'mt-0.5 h-4 w-4 shrink-0 text-fp-text-secondary transition-transform duration-150',
            open && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div id={detailId} className="space-y-3 px-4 pb-4 pt-1">
          {request.instructions && (
            <Detail label="Instructions">
              <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-fp-text-secondary">
                {request.instructions}
              </p>
            </Detail>
          )}

          {(isSubmitted || request.status === 'ACCEPTED') && <Answer request={request} />}

          {mode !== 'edit' && <Timeline request={request} />}

          {mode === 'edit' ? (
            <RequestEditor
              request={request}
              busy={busy}
              onSave={run}
              onCancel={backToView}
            />
          ) : (
            canManage &&
            (isOpen || isSubmitted) &&
            (mode === 'confirm-cancel' ? (
              // Own key: the confirm buttons must be NEW elements, or focus would
              // stay on the old button that is now the destructive one.
              <div
                key="confirm-cancel"
                className="flex flex-wrap items-center gap-2 rounded-lg border border-fp-danger/25 bg-fp-danger/5 px-3 py-2.5"
              >
                <p className="basis-full text-xs text-fp-text-secondary sm:flex-1 sm:basis-0">
                  Cancel this request? Your client will no longer see it. This can&rsquo;t be undone.
                </p>
                <ActionButton variant="secondary" onClick={backToView} disabled={busy} autoFocus>
                  Keep request
                </ActionButton>
                <ActionButton
                  variant="dangerSolid"
                  icon={XCircle}
                  loading={busy}
                  onClick={() => run({ action: 'cancel' })}
                >
                  Cancel request
                </ActionButton>
              </div>
            ) : (
              <div key="actions" className="flex flex-wrap items-center gap-2">
                {isSubmitted && (
                  <ActionButton
                    variant="primary"
                    icon={CheckCircle2}
                    loading={busy}
                    onClick={() => run({ action: 'accept' })}
                  >
                    Accept answer
                  </ActionButton>
                )}
                {isOpen && (
                  <ActionButton icon={Pencil} onClick={() => goTo('edit')} disabled={busy}>
                    Edit
                  </ActionButton>
                )}
                <ActionButton
                  variant="danger"
                  className="sm:ml-auto"
                  onClick={() => goTo('confirm-cancel')}
                  disabled={busy}
                >
                  Cancel request
                </ActionButton>
              </div>
            ))
          )}

          {error && (
            <p role="alert" className="text-xs text-fp-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </li>
  )
}
