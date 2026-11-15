// components/dashboard/requests/ClientRequestsPanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The team's side of Client Requests, opened from the project sidebar
// ("Client Requests" button -> ?panel=requests -> ProjectPanelDialog).
//
// WHAT IT SHOWS
//   - the "waiting on client" ledger (days blocked, open items, longest wait)
//   - requests in three groups: Needs your review / Waiting on client / Closed
//   - a composer (opened with "New request") to ask the client for something
//
// DATA: hooks/useClientRequests.js owns fetching and changes. This file never
// touches the database; every call goes through the API routes.
//
// PERMISSIONS: the server enforces everything. `permissions` only decides what
// to SHOW:
//   canViewClientRequests   no -> a "restricted" notice, nothing is fetched
//   canManageClientRequests no -> read-only list (no composer, no actions)
// ─────────────────────────────────────────────────────────────────────────────
'use client'

import { useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, ChevronDown, ClipboardList, Lock, Plus, X } from 'lucide-react'
import { useClientRequests } from '@/hooks/useClientRequests'
import { cn } from '@/lib/utils'
import BlockedSummary from './BlockedSummary'
import RequestComposer from './RequestComposer'
import RequestRow from './RequestRow'
import { ActionButton, thinScrollbar } from './request-ui'
import { plural } from './request-format'

function RestrictedNotice() {
  return (
    <div className="flex items-center gap-2 py-4 text-xs text-fp-text-secondary">
      <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Client requests are restricted for your role on this project.
    </div>
  )
}

// Same heights as the real summary and rows, so nothing jumps when data lands.
function PanelSkeleton() {
  return (
    <div role="status" aria-label="Loading requests" className="space-y-5 motion-safe:animate-pulse">
      <div className="h-[4.25rem] rounded-xl bg-fp-raised/70" />
      <div className="divide-y divide-fp-border rounded-xl border border-fp-border">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-16 px-4 py-3.5">
            <div className="h-3.5 w-2/5 rounded bg-fp-raised" />
            <div className="mt-2.5 h-2.5 w-3/5 rounded bg-fp-raised/70" />
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ canCompose, canManage }) {
  let hint = 'Nothing has been requested from the client yet.'
  if (canCompose) {
    hint = 'Use New request to ask for a written answer, an approval or a file. Your client gets one email and replies from their portal.'
  } else if (canManage) {
    hint = 'Add a client to this project first, then you can send them requests.'
  }

  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <ClipboardList className="h-5 w-5 text-fp-text-secondary" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-fp-text-primary">No requests yet</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-fp-text-secondary">{hint}</p>
    </div>
  )
}

function GroupHeading({ title, count }) {
  return (
    <h3 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-fp-text-secondary">
      {title}
      <span className="rounded-full bg-fp-raised px-1.5 py-0.5 tabular-nums">{count}</span>
    </h3>
  )
}

const listClass = 'divide-y divide-fp-border overflow-hidden rounded-xl border border-fp-border'

function RequestGroup({ title, requests, projectId, canManage }) {
  if (requests.length === 0) return null
  return (
    <section>
      <GroupHeading title={title} count={requests.length} />
      <ul className={listClass}>
        {requests.map((request) => (
          <RequestRow key={request.id} request={request} projectId={projectId} canManage={canManage} />
        ))}
      </ul>
    </section>
  )
}

function ClosedGroup({ requests, projectId, canManage }) {
  if (requests.length === 0) return null
  return (
    <details className="group">
      <summary className="mb-2 flex cursor-pointer list-none items-center gap-2 rounded text-[10px] font-bold uppercase tracking-widest text-fp-text-secondary hover:text-fp-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-accent/40 [&::-webkit-details-marker]:hidden">
        Closed
        <span className="rounded-full bg-fp-raised px-1.5 py-0.5 tabular-nums">{requests.length}</span>
        <ChevronDown
          className="h-3.5 w-3.5 transition-transform duration-150 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <ul className={listClass}>
        {requests.map((request) => (
          <RequestRow key={request.id} request={request} projectId={projectId} canManage={canManage} />
        ))}
      </ul>
    </details>
  )
}

function Notice({ tone, children, onDismiss }) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs',
        tone === 'warn'
          ? 'border-fp-warning/25 bg-fp-warning/10 text-fp-text-primary'
          : 'border-fp-success/25 bg-fp-success/10 text-fp-text-primary'
      )}
    >
      <p className="min-w-0 flex-1 leading-relaxed">{children}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss message"
        className="-m-1 rounded p-1 text-fp-text-secondary transition-colors hover:text-fp-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-accent/40"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}

export default function ClientRequestsPanel({ projectId, milestones = [], hasClient = true, permissions = {} }) {
  const canView = Boolean(permissions.canViewClientRequests)
  const canManage = Boolean(permissions.canManageClientRequests)
  const canCompose = canManage && hasClient

  const { requests, blocked, isLoading, accessDenied, loadFailed, refreshFailed, reload } =
    useClientRequests(projectId, canView)

  const [composing, setComposing] = useState(false)
  const [notice, setNotice] = useState(null) // { tone: 'ok' | 'warn', text }
  const toggleRef = useRef(null)

  if (!canView || accessDenied) return <RestrictedNotice />

  const review = requests.filter((r) => r.status === 'SUBMITTED')
  const waiting = requests.filter((r) => r.status === 'OPEN')
  const closed = requests.filter((r) => r.status === 'ACCEPTED' || r.status === 'CANCELLED')

  function openComposer() {
    setNotice(null)
    setComposing(true)
  }

  // The toggle button stays mounted, so focus goes back to it.
  function closeComposer() {
    setComposing(false)
    toggleRef.current?.focus()
  }

  function handleCreated({ count, notified, emailSent }) {
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
    closeComposer()
  }

  return (
    <div className="flex max-h-[80dvh] flex-col">
      <header className="flex flex-none flex-wrap items-start justify-between gap-x-4 gap-y-3 pr-8 sm:flex-nowrap">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-fp-text-primary">
            {composing ? 'New request' : 'Client requests'}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-fp-text-secondary">
            {composing
              ? 'Ask your client for something. Several requests go out in one email.'
              : 'Ask your client for answers or approvals. Blocked days count how long you were waiting on them.'}
          </p>
        </div>
        {canCompose && (
          <ActionButton
            ref={toggleRef}
            variant={composing ? 'secondary' : 'primary'}
            className="shrink-0"
            icon={composing ? ArrowLeft : Plus}
            onClick={composing ? closeComposer : openComposer}
          >
            {composing ? 'Back to requests' : 'New request'}
          </ActionButton>
        )}
      </header>

      <div className={cn('-mx-1 mt-5 min-h-0 flex-1 space-y-5 overflow-y-auto px-1', thinScrollbar)}>
        {composing ? (
          <RequestComposer
            projectId={projectId}
            milestones={milestones}
            onCreated={handleCreated}
            onCancel={closeComposer}
          />
        ) : (
          <>
            {notice && (
              <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
                {notice.text}
              </Notice>
            )}

            {canManage && !hasClient && (
              <div className="flex items-start gap-2 rounded-lg border border-fp-warning/25 bg-fp-warning/10 px-3 py-2.5 text-xs text-fp-text-secondary">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fp-warning" aria-hidden="true" />
                This project has no client yet, so there is nobody to send requests to. Add a client first.
              </div>
            )}

            {isLoading && <PanelSkeleton />}

            {loadFailed && (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-fp-border px-4 py-3">
                <p className="text-xs text-fp-text-secondary">We could not load the requests. Check your connection and try again.</p>
                <ActionButton onClick={() => reload()}>Try again</ActionButton>
              </div>
            )}

            {refreshFailed && (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-3 text-xs text-fp-text-secondary">
                <p>Could not refresh. Showing the last loaded requests.</p>
                <ActionButton variant="ghost" onClick={() => reload()}>
                  Retry
                </ActionButton>
              </div>
            )}

            {!isLoading && !loadFailed && requests.length === 0 && (
              <EmptyState canCompose={canCompose} canManage={canManage} />
            )}

            {requests.length > 0 && (
              <>
                <BlockedSummary blocked={blocked} />
                <RequestGroup title="Needs your review" requests={review} projectId={projectId} canManage={canManage} />
                <RequestGroup title="Waiting on client" requests={waiting} projectId={projectId} canManage={canManage} />
                <ClosedGroup requests={closed} projectId={projectId} canManage={canManage} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}