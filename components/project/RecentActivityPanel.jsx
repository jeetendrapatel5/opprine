// components/project/RecentActivityPanel.jsx
//
// Project Delivery Pulse, shown in the "Project activity" dialog.
//   1) Needs attention: what is stuck and who must act (GET /attention).
//   2) Activity: what happened, grouped by day (GET /activity, "Load more").
// The server decides what needs attention; this file only shows it.
// The dialog's own title is screen-reader-only, so the panel draws a visible
// header. The list scrolls inside the dialog. No polling.

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  Flag,
  GitBranch,
  Lock,
  Paperclip,
  RotateCcw,
  XCircle,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  actorLabel,
  describeLoadError,
  dueLabel,
  entityTarget,
  eventCategory,
  eventIcon,
  eventTone,
  groupByDay,
  isNewEvent,
  mergeById,
  newSummary,
  splitTitle,
  summaryStats,
  timeOfDay,
  waitingLabel,
} from '@/lib/pulse-format.js'

const PAGE_SIZE = 20

const ICONS = {
  update: FileText,
  github: GitBranch,
  milestone: Flag,
  request: ClipboardList,
  file: Paperclip,
  done: CheckCircle2,
  changes: RotateCcw,
  cancelled: XCircle,
}

// Soft tinted badge per tone (same tint style as the rest of the app).
const BADGE = {
  accent: 'bg-fp-accent-muted text-fp-accent',
  success: 'bg-fp-success/10 text-fp-success',
  warning: 'bg-fp-warning/10 text-fp-warning',
  neutral: 'bg-fp-raised text-fp-text-tertiary',
}

const sectionLabel = 'text-[11px] font-semibold uppercase tracking-wider text-fp-text-tertiary'
const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-accent/40'
const ghostButton = `text-xs font-medium text-fp-text-secondary border border-fp-border rounded-lg px-3 py-1.5 hover:text-fp-text-primary hover:bg-fp-raised transition-colors disabled:opacity-60 ${focusRing}`

// Slim 4px scrollbar in the app's colours. Chrome/Edge/Safari use the
// ::-webkit-scrollbar rules (they IGNORE them if `scrollbar-width` is also
// set), so the standard properties are applied only where ::-webkit-scrollbar
// does not exist, i.e. Firefox, which supports "thin" but not an exact width.
const thinScrollbar =
  '[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:my-2 [&::-webkit-scrollbar-track]:bg-transparent ' +
  '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-fp-text-tertiary/40 ' +
  '[&::-webkit-scrollbar-thumb:hover]:bg-fp-text-tertiary/80 ' +
  'supports-[not_selector(::-webkit-scrollbar)]:[scrollbar-width:thin] ' +
  'supports-[not_selector(::-webkit-scrollbar)]:[scrollbar-color:var(--color-fp-text-tertiary)_transparent]'

const errorOf = (err) => describeLoadError(err?.response?.status, err?.response?.data?.error)

// ── Data hooks ──────────────────────────────────────────────────────────────

// Needs attention: one request, no paging.
function useAttention(projectId, enabled) {
  const [state, setState] = useState({ status: enabled ? 'loading' : 'idle', data: null, error: null })
  const [tick, setTick] = useState(0) // bump to reload

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    axios
      .get(`/api/projects/${projectId}/attention`, { signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted) setState({ status: 'ready', data: res.data, error: null })
      })
      .catch((err) => {
        if (controller.signal.aborted || axios.isCancel(err)) return
        setState({ status: 'error', data: null, error: errorOf(err) })
      })
    return () => controller.abort()
  }, [projectId, enabled, tick])

  const retry = () => {
    setState((s) => ({ ...s, status: 'loading' }))
    setTick((t) => t + 1)
  }
  return { ...state, retry }
}

// Timeline: first page, then "Load more" with the server's nextCursor.
function useTimeline(projectId, enabled) {
  const [state, setState] = useState({
    status: enabled ? 'loading' : 'idle',
    items: [],
    nextCursor: null,
    seenBefore: null, // when this person last opened the panel (before now)
    error: null,
  })
  const [more, setMore] = useState({ loading: false, error: null })
  const [tick, setTick] = useState(0)
  const moreController = useRef(null)

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    axios
      .get(`/api/projects/${projectId}/activity`, {
        params: { limit: PAGE_SIZE },
        signal: controller.signal,
      })
      .then((res) => {
        if (controller.signal.aborted) return
        setState({
          status: 'ready',
          items: res.data.items,
          nextCursor: res.data.nextCursor,
          seenBefore: res.data.lastSeenAt ?? null,
          error: null,
        })
        // Opening the panel counts as seeing the newest event. Fire and forget:
        // if it fails, the "New" marks simply show again next time.
        if (res.data.items.length > 0) {
          axios
            .post(`/api/projects/${projectId}/activity/seen`, { through: res.data.items[0].occurredAt })
            .catch(() => {})
        }
      })
      .catch((err) => {
        if (controller.signal.aborted || axios.isCancel(err)) return
        setState({ status: 'error', items: [], nextCursor: null, seenBefore: null, error: errorOf(err) })
      })
    return () => {
      controller.abort()
      moreController.current?.abort()
    }
  }, [projectId, enabled, tick])

  const retry = () => {
    setState((s) => ({ ...s, status: 'loading' }))
    setMore({ loading: false, error: null })
    setTick((t) => t + 1)
  }

  const loadMore = useCallback(() => {
    if (!state.nextCursor || more.loading) return
    const controller = new AbortController()
    moreController.current = controller
    setMore({ loading: true, error: null })
    axios
      .get(`/api/projects/${projectId}/activity`, {
        params: { limit: PAGE_SIZE, cursor: state.nextCursor },
        signal: controller.signal,
      })
      .then((res) => {
        if (controller.signal.aborted) return
        setState((s) => ({ ...s, items: mergeById(s.items, res.data.items), nextCursor: res.data.nextCursor }))
        setMore({ loading: false, error: null })
      })
      .catch((err) => {
        if (controller.signal.aborted || axios.isCancel(err)) return
        setMore({ loading: false, error: errorOf(err).text }) // keep items already shown
      })
  }, [projectId, state.nextCursor, more.loading])

  return { ...state, more, retry, loadMore }
}

// ── Small pieces ────────────────────────────────────────────────────────────

// A title with the thing it is ABOUT (“quoted name”) emphasised.
function TitleText({ title, className = '' }) {
  return (
    <p className={`text-[13px] leading-snug text-fp-text-secondary break-words line-clamp-2 ${className}`}>
      {splitTitle(title).map((part, i) =>
        part.strong ? (
          <span key={i} className="font-medium text-fp-text-primary">
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </p>
  )
}

function Pill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-fp-raised text-fp-text-secondary',
    accent: 'bg-fp-accent-muted text-fp-accent',
    danger: 'bg-fp-danger/10 text-fp-danger',
  }
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

function SectionHeader({ id, title, count, note }) {
  return (
    <div className="flex items-center gap-2">
      <h3 id={id} className={sectionLabel}>
        {title}
      </h3>
      {count > 0 && (
        <span className="rounded-full bg-fp-raised px-1.5 py-px text-[10px] font-semibold tabular-nums text-fp-text-secondary">
          {count}
        </span>
      )}
      {note && <span className="ml-auto text-[11px] font-medium text-fp-accent">{note}</span>}
    </div>
  )
}

function EmptyBox({ children }) {
  return (
    <p className="rounded-lg border border-dashed border-fp-border px-4 py-5 text-center text-xs leading-relaxed text-fp-text-tertiary">
      {children}
    </p>
  )
}

function ErrorBox({ text, onRetry }) {
  return (
    <div className="rounded-lg border border-fp-danger/30 bg-fp-danger/5 px-3 py-3">
      <p role="alert" className="mb-2 text-xs text-fp-danger">
        {text}
      </p>
      <button type="button" onClick={onRetry} className={`${ghostButton} bg-fp-surface`}>
        Try again
      </button>
    </div>
  )
}

function RowSkeleton({ card = false }) {
  return (
    <div className={`flex items-center gap-3 ${card ? 'rounded-lg border border-fp-border px-3 py-3' : 'py-2'}`}>
      {!card && <Skeleton className="bg-fp-raised h-7 w-7 shrink-0 rounded-full" />}
      <div className="flex-1 space-y-2">
        <Skeleton className="bg-fp-raised h-3 w-4/5" />
        <Skeleton className="bg-fp-raised h-2.5 w-2/5" />
      </div>
    </div>
  )
}

function Loading({ rows = 3, card = false, label }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className={card ? 'space-y-2' : ''}>
        {Array.from({ length: rows }, (_, i) => (
          <RowSkeleton key={i} card={card} />
        ))}
      </div>
    </div>
  )
}

// ── Needs attention ─────────────────────────────────────────────────────────

function AttentionCard({ item, onOpen }) {
  const target = entityTarget(item.entity)
  const high = item.priority === 'HIGH'
  const meta = [waitingLabel(item), dueLabel(item.dueDate)].filter(Boolean).join(' · ')

  const body = (
    <>
      <div className="min-w-0 flex-1">
        <TitleText title={item.title} />
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Pill tone="accent">{item.nextActionBy === 'CLIENT' ? 'Client to act' : 'Team to act'}</Pill>
          {item.blocking && <Pill tone="danger">Blocking</Pill>}
          {item.overdue && <Pill tone="danger">Overdue</Pill>}
          <span className="text-[11px] text-fp-text-tertiary">{meta}</span>
        </div>
      </div>
      {target && <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-fp-text-tertiary" aria-hidden="true" />}
    </>
  )

  const base = `flex w-full items-start gap-3 rounded-lg border border-fp-border border-l-2 px-3 py-3 text-left ${
    high ? 'border-l-fp-danger' : 'border-l-fp-text-tertiary/40'
  }`

  return (
    <li>
      {target ? (
        <button
          type="button"
          onClick={() => onOpen(target)}
          className={`${base} transition-colors hover:bg-fp-raised ${focusRing}`}
        >
          {body}
          <span className="sr-only">Open</span>
        </button>
      ) : (
        <div className={base}>{body}</div>
      )}
    </li>
  )
}

function AttentionSection({ attention, onOpen }) {
  const { status, data, error, retry } = attention
  const items = data?.items ?? []
  const stats = summaryStats(data?.summary)

  return (
    <section aria-labelledby="pulse-attention" className="space-y-3">
      <SectionHeader id="pulse-attention" title="Needs attention" count={status === 'ready' ? items.length : 0} />

      {status === 'loading' && <Loading card label="Loading items that need attention" />}
      {status === 'error' && <ErrorBox text={error.text} onRetry={retry} />}
      {status === 'ready' && items.length === 0 && (
        <EmptyBox>
          Nothing needs attention right now. Open client requests, reviews and late milestones will show up here.
        </EmptyBox>
      )}

      {status === 'ready' && items.length > 0 && (
        <>
          {stats && (
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.key} className="flex flex-col-reverse rounded-lg bg-fp-raised/60 px-3 py-2">
                  <dt className="text-[11px] text-fp-text-tertiary">{s.label}</dt>
                  <dd
                    className={`text-base font-semibold tabular-nums ${
                      s.alarm && s.value > 0 ? 'text-fp-danger' : 'text-fp-text-primary'
                    }`}
                  >
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <ul className="space-y-2">
            {items.map((item) => (
              <AttentionCard key={item.id} item={item} onOpen={onOpen} />
            ))}
          </ul>
          {data?.truncated && <p className="text-[11px] text-fp-text-tertiary">Showing the most urgent items only.</p>}
        </>
      )}
    </section>
  )
}

// ── Timeline ────────────────────────────────────────────────────────────────

function TimelineRow({ event, onOpen, isNew }) {
  const target = entityTarget(event.entity)
  const Icon = ICONS[eventIcon(event.type)] ?? FileText
  const excerpt = typeof event.metadata?.excerpt === 'string' ? event.metadata.excerpt : null
  const time = timeOfDay(event.occurredAt)
  const actor = actorLabel(event.actor)
  const category = eventCategory(event.type)
  // Skip the category when it just repeats the actor ("GitHub · GitHub").
  const meta = [actor, time, category !== actor ? category : null].filter(Boolean)

  const body = (
    <>
      <span
        className={`relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4 ring-fp-surface ${BADGE[eventTone(event.type)]}`}
        aria-hidden="true"
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <TitleText title={event.title} />
        {excerpt && (
          <p className="mt-1 text-xs leading-relaxed text-fp-text-secondary break-words line-clamp-2">{excerpt}</p>
        )}
        <p className="mt-0.5 text-[11px] text-fp-text-tertiary">
          <time dateTime={event.occurredAt} title={new Date(event.occurredAt).toLocaleString()}>
            {meta.join(' · ')}
          </time>
          {isNew && (
            <span className="ml-1.5 rounded bg-fp-accent-muted px-1 py-px text-[10px] font-semibold text-fp-accent">
              New
            </span>
          )}
        </p>
      </div>
      {target && <ChevronRight className="mt-1.5 h-4 w-4 shrink-0 text-fp-text-tertiary" aria-hidden="true" />}
    </>
  )

  const base = '-mx-2 flex w-[calc(100%+1rem)] items-start gap-3 rounded-lg px-2 py-2 text-left'
  return (
    <li>
      {target ? (
        <button
          type="button"
          onClick={() => onOpen(target)}
          className={`${base} transition-colors hover:bg-fp-raised ${focusRing}`}
        >
          {body}
          <span className="sr-only">Open</span>
        </button>
      ) : (
        <div className={base}>{body}</div>
      )}
    </li>
  )
}

function TimelineSection({ timeline, onOpen, viewerId }) {
  const { status, items, nextCursor, seenBefore, error, more, retry, loadMore } = timeline
  const groups = groupByDay(items)

  return (
    <section aria-labelledby="pulse-activity" className="space-y-3">
      <SectionHeader
        id="pulse-activity"
        title="Activity"
        count={0}
        note={status === 'ready' ? newSummary(items, seenBefore, viewerId, Boolean(nextCursor)) : null}
      />

      {status === 'loading' && <Loading rows={5} label="Loading activity" />}
      {status === 'error' && <ErrorBox text={error.text} onRetry={retry} />}
      {status === 'ready' && items.length === 0 && (
        <EmptyBox>
          No activity recorded yet. Updates, milestone changes and client requests are recorded from now on. Older
          updates stay in the Updates tab.
        </EmptyBox>
      )}

      {status === 'ready' &&
        groups.map((group) => (
          <div key={group.key}>
            <h4 className="sticky top-0 z-10 bg-fp-surface py-1.5 text-xs font-medium text-fp-text-primary">
              {group.label}
            </h4>
            <ol className="relative before:absolute before:bottom-5 before:left-[13px] before:top-5 before:w-px before:bg-fp-text-tertiary/30">
              {group.items.map((event) => (
                <TimelineRow key={event.id} event={event} onOpen={onOpen} isNew={isNewEvent(event, seenBefore, viewerId)} />
              ))}
            </ol>
          </div>
        ))}

      {status === 'ready' && items.length > 0 && (
        <div className="pt-1">
          {more.error && (
            <p role="alert" className="mb-2 text-center text-xs text-fp-danger">
              {more.error}
            </p>
          )}
          {nextCursor ? (
            <button type="button" onClick={loadMore} disabled={more.loading} className={`${ghostButton} w-full py-2`}>
              {more.loading ? 'Loading…' : more.error ? 'Try again' : 'Load more'}
            </button>
          ) : (
            <p className="text-center text-[11px] text-fp-text-tertiary">That is everything recorded so far.</p>
          )}
        </div>
      )}
    </section>
  )
}

// ── The panel ───────────────────────────────────────────────────────────────

// canView is a UI convenience from the server page; the API routes enforce it.
// viewerId = the signed-in user, so their own actions are never marked "New".
export default function RecentActivityPanel({ projectId, viewerId, canView = true }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const attention = useAttention(projectId, canView)
  const timeline = useTimeline(projectId, canView)

  // "Open": requests -> switch dialog to the requests panel;
  //         milestones -> close dialog and scroll to the milestones section.
  const open = (target) => {
    const params = new URLSearchParams(searchParams.toString())
    if (target === 'requests') {
      params.set('panel', 'requests')
    } else {
      params.delete('panel')
    }
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    if (target === 'milestones') {
      // Wait for the dialog to unmount (it locks page scroll).
      setTimeout(() => document.getElementById('milestones')?.scrollIntoView({ behavior: 'smooth' }), 150)
    }
  }

  const restricted = !canView || attention.error?.kind === 'restricted' || timeline.error?.kind === 'restricted'
  if (restricted) {
    return (
      <div className="flex items-center gap-2 px-1 py-4 text-xs text-fp-text-tertiary">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        Project activity is not available for your role on this project.
      </div>
    )
  }

  // -mx-4 / -mt-4 / -mb-4 cancel the dialog's p-4 so the divider and the
  // scrollbar reach the dialog edges.
  return (
    <div className="-m-4 flex flex-col">
      <header className="border-b border-fp-border px-5 py-4 pr-12">
        <p className="text-base font-semibold text-fp-text-primary">Project activity</p>
        <p className="mt-0.5 text-xs text-fp-text-secondary">What needs attention and what has happened.</p>
      </header>
      <div className={`max-h-[min(34rem,calc(100dvh-13rem))] space-y-8 overflow-y-auto overscroll-contain px-5 py-5 ${thinScrollbar}`}>
        <AttentionSection attention={attention} onOpen={open} />
        <TimelineSection timeline={timeline} onOpen={open} viewerId={viewerId} />
      </div>
    </div>
  )
}