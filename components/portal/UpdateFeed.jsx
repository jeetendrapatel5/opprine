// components/portal/UpdateFeed.jsx
// Project-level update log: the legacy Update model plus auto-generated deploy
// notes. Reads like a logbook: entries are grouped by day, the newest one leads,
// and shipped work (deploys) carries a small "dispatch" strip with its commit
// reference and preview link. Shows the latest few; the rest sit behind
// "Show earlier updates", which continues the rail instead of breaking it.
'use client'

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'

import {
  Activity,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GitCommitHorizontal,
  Rocket,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatClock, formatDateTime, groupByDay, timeAgo } from '@/lib/portal-format'
import ActivityBars from './ActivityBars'
import { Badge, Card, CardBody, CardHeader, EmptyState, Eyebrow, focusRing } from './ui'

// ── Time ──────────────────────────────────────────────────────────────────────
// `now` is null on the server and during hydration, then becomes the real time
// and refreshes every minute. Anything that depends on the viewer's clock or
// time zone waits for it, so server and browser always render the same markup.

function subscribeToMinute(onTick) {
  const id = setInterval(onTick, 60_000)
  return () => clearInterval(id)
}
const getMinute = () => Math.floor(Date.now() / 60_000) * 60_000
const getServerNow = () => null

function useNow() {
  return useSyncExternalStore(subscribeToMinute, getMinute, getServerNow)
}

// ── Config ────────────────────────────────────────────────────────────────────

// Marker shape carries the meaning, so it still reads without colour:
//   ring = underway · ring + dot = waiting on your eyes · check = done
const STATUS = {
  IN_PROGRESS: { label: 'In progress', text: 'text-fp-portal-accent-strong', marker: 'ring' },
  IN_REVIEW:   { label: 'In review',   text: 'text-fp-portal-accent-strong', marker: 'review' },
  DONE:        { label: 'Completed',   text: 'text-fp-portal-success',       marker: 'done' },
}

const FILTERS = [
  { id: 'all',      label: 'All' },
  { id: 'progress', label: 'Progress' },
  { id: 'deploys',  label: 'Deploys' },
]

const INITIAL_COUNT = 4
const MAX_STAGGER_STEPS = 6

const isDeploy = (update) => update.type === 'AUTO_DEPLOY'

// Only http(s) links are rendered as links; anything else is dropped.
function safeHttpUrl(value) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

// ── Entry building blocks ─────────────────────────────────────────────────────

// Marker column and rail share one width, so the rail runs straight through
// every marker, including the dashed "earlier updates" node at the bottom.
const ROW = 'grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3'
const MARKER = 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full'

function Marker({ kind }) {
  if (kind === 'deploy') {
    return (
      <span className={cn(MARKER, 'bg-fp-portal-ink text-fp-portal-ink-text')}>
        <Rocket className="h-3 w-3" />
      </span>
    )
  }
  if (kind === 'done') {
    return (
      <span className={cn(MARKER, 'bg-fp-portal-success text-white')}>
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    )
  }
  return (
    <span className={cn(MARKER, 'border-2 border-fp-portal-accent bg-fp-portal-surface')}>
      {kind === 'review' && <span className="h-1.5 w-1.5 rounded-full bg-fp-portal-accent" />}
    </span>
  )
}

// One row of the log: marker + rail on the left, content on the right. The rail
// is a flexible line under the marker, so it needs no negative margins. It
// stops at the last entry of each day, and runs on into the "earlier" node
// when more history is waiting (`isLast` is false then).
function EntryShell({ marker, isLast, enterStep, children }) {
  const entering = enterStep != null
  return (
    <li className={cn(ROW, entering && 'fp-rise')} style={entering ? { '--i': enterStep } : undefined}>
      <div aria-hidden="true" className="flex flex-col items-center">
        {marker}
        {!isLast && <span className="my-1 w-px flex-1 bg-fp-portal-border" />}
      </div>
      <div className={cn('min-w-0', !isLast && 'pb-5')}>{children}</div>
    </li>
  )
}

function EntryHeader({ label, labelClass, date, ready, isLatest }) {
  const time = new Date(date)
  const valid = !Number.isNaN(time.getTime())
  return (
    <div className="flex min-h-5 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <p className={cn('text-xs font-semibold', labelClass)}>{label}</p>
        {isLatest && (
          <Badge tone="accent" className="px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
            Latest
          </Badge>
        )}
      </div>
      {valid && (
        <time
          dateTime={time.toISOString()}
          title={ready ? formatDateTime(time) : undefined}
          className="shrink-0 text-xs tabular-nums text-fp-portal-text-muted"
        >
          {ready ? formatClock(time) : null}
        </time>
      )}
    </div>
  )
}

// The newest entry leads: larger, heavier, full-strength ink. Older ones step
// back to the secondary text colour so the eye lands on "what just happened".
function EntryText({ isLatest, children }) {
  return (
    <p
      className={cn(
        'mt-1 max-w-prose text-pretty break-words leading-relaxed',
        isLatest
          ? 'text-[15px] font-medium text-fp-portal-text-primary'
          : 'text-sm text-fp-portal-text-secondary',
      )}
    >
      {children}
    </p>
  )
}

// Shared look for the two controls inside a dispatch strip.
// The ::before stretches the tap area to 44px on touch without making the control taller.
const STRIP_ACTION =
  'relative inline-flex min-h-9 items-center gap-1.5 rounded-sm px-2.5 text-xs font-semibold ' +
  'transition-[color,background-color,box-shadow,transform] duration-150 ' +
  'before:absolute before:inset-x-0 before:-inset-y-1 ' +
  'hover:bg-fp-portal-surface hover:shadow-fp-card active:scale-[0.97] sm:min-h-8'

function CommitChip({ sha }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(sha)
    } catch {
      return // Clipboard needs HTTPS and permission; if blocked, stay quiet.
    }
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1600)
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        title="Copy full commit ID"
        aria-label={`Copy commit ID ${sha.slice(0, 7)}`}
        className={cn(
          STRIP_ACTION,
          'font-mono',
          copied
            ? 'text-fp-portal-success'
            : 'text-fp-portal-text-secondary hover:text-fp-portal-text-primary',
          focusRing,
        )}
      >
        {copied ? (
          <Check
            className="h-3.5 w-3.5 animate-in fade-in zoom-in-75 duration-150 motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <GitCommitHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {copied ? 'Copied' : sha.slice(0, 7)}
      </button>
      <span role="status" className="sr-only">
        {copied ? 'Commit ID copied' : ''}
      </span>
    </>
  )
}

// Auto-generated from a deploy (AI-summarised commits).
function DeployEntry({ update, isLatest, isLast, ready, enterStep }) {
  const previewUrl = safeHttpUrl(update.previewUrl)
  return (
    <EntryShell marker={<Marker kind="deploy" />} isLast={isLast} enterStep={enterStep}>
      <EntryHeader
        label="Deployed"
        labelClass="text-fp-portal-text-primary"
        date={update.createdAt}
        ready={ready}
        isLatest={isLatest}
      />
      <EntryText isLatest={isLatest}>{update.text}</EntryText>
      {(update.commitSha || previewUrl) && (
        <div className="mt-3 flex w-fit max-w-full items-center gap-1 rounded-lg bg-fp-portal-raised p-1">
          {update.commitSha && <CommitChip sha={update.commitSha} />}
          {update.commitSha && previewUrl && (
            <span aria-hidden="true" className="h-4 w-px bg-fp-portal-border" />
          )}
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(STRIP_ACTION, 'group text-fp-portal-accent-strong', focusRing)}
            >
              Preview
              <ExternalLink
                className="h-3.5 w-3.5 transition-transform duration-150 group-hover:-translate-y-px group-hover:translate-x-px"
                aria-hidden="true"
              />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
        </div>
      )}
    </EntryShell>
  )
}

function StatusEntry({ update, isLatest, isLast, ready, enterStep }) {
  const status = STATUS[update.status] ?? STATUS.IN_PROGRESS
  return (
    <EntryShell marker={<Marker kind={status.marker} />} isLast={isLast} enterStep={enterStep}>
      <EntryHeader
        label={status.label}
        labelClass={status.text}
        date={update.createdAt}
        ready={ready}
        isLatest={isLatest}
      />
      <EntryText isLatest={isLatest}>{update.text}</EntryText>
    </EntryShell>
  )
}

// ── Controls ──────────────────────────────────────────────────────────────────

// Native buttons with aria-pressed. The ::before stretches the tap area to 40px
// tall without making the pill itself taller.
function FilterBar({ value, counts, onChange, controlsId }) {
  return (
    <div role="group" aria-label="Filter updates" className="mb-6 flex flex-wrap gap-1">
      {FILTERS.map((filter) => {
        const active = filter.id === value
        return (
          <button
            key={filter.id}
            type="button"
            aria-pressed={active}
            aria-controls={controlsId}
            onClick={() => onChange(filter.id)}
            className={cn(
              'relative inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold',
              'transition-[color,background-color,transform] duration-150 active:scale-[0.97]',
              'before:absolute before:inset-x-0 before:-inset-y-1',
              active
                ? 'bg-fp-portal-raised text-fp-portal-text-primary'
                : 'text-fp-portal-text-muted hover:bg-fp-portal-raised/60 hover:text-fp-portal-text-secondary',
              focusRing,
            )}
          >
            {filter.label}
            <span className="tabular-nums text-fp-portal-text-muted">{counts[filter.id]}</span>
          </button>
        )
      })}
    </div>
  )
}

// The last row of the log. Collapsed, the rail runs down into this dashed node
// ("there is more history below"); expanded, it becomes the way back up.
// A native <button> laid out on the same grid as the entries, so it lines up.
function HistoryToggle({ expanded, hiddenCount, onToggle, controlsId }) {
  const Icon = expanded ? ChevronUp : ChevronDown
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={controlsId}
      className={cn(
        ROW,
        // ::before grows the tap area to 44px without adding visible height.
        'group relative w-full items-start rounded-lg text-left before:absolute before:inset-x-0 before:-inset-y-3',
        expanded && 'mt-6',
        focusRing,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          MARKER,
          'border border-dashed border-fp-portal-border-control text-fp-portal-text-muted',
          'transition-colors duration-150 group-hover:border-fp-portal-accent-strong group-hover:text-fp-portal-accent-strong',
        )}
      >
        <Icon className="h-3 w-3 transition-transform duration-150 group-hover:translate-y-px" />
      </span>
      <span
        className={cn(
          'flex min-h-5 items-center text-xs font-semibold text-fp-portal-text-secondary',
          'transition-colors duration-150 group-hover:text-fp-portal-text-primary',
        )}
      >
        {expanded ? 'Show fewer updates' : `Show earlier updates (${hiddenCount})`}
      </span>
    </button>
  )
}

// ── Feed ──────────────────────────────────────────────────────────────────────

export default function UpdateFeed({ updates, activity }) {
  const now = useNow()
  const ready = now !== null
  const listId = useId()

  const [filter, setFilter] = useState('all')
  const [showAll, setShowAll] = useState(false)
  // Index from which entries animate in. null = no animation (first paint).
  const [enterFrom, setEnterFrom] = useState(null)

  const hasUpdates = Boolean(updates && updates.length > 0)
  const all = hasUpdates ? updates : []
  const deployCount = all.filter(isDeploy).length
  const counts = { all: all.length, progress: all.length - deployCount, deploys: deployCount }

  // Filtering only helps once there is enough to filter and both kinds exist.
  const showFilter = all.length > INITIAL_COUNT && deployCount > 0 && deployCount < all.length
  const activeFilter = showFilter ? filter : 'all'

  const filtered =
    activeFilter === 'deploys' ? all.filter(isDeploy)
    : activeFilter === 'progress' ? all.filter((update) => !isDeploy(update))
    : all
  const visible = showAll ? filtered : filtered.slice(0, INITIAL_COUNT)
  const hiddenCount = filtered.length - INITIAL_COUNT
  const railContinues = hiddenCount > 0 && !showAll

  const groups = groupByDay(visible, { now })
  const indexById = new Map(visible.map((update, index) => [update.id, index]))
  const latestId = all[0]?.id

  // "Last update 11 minutes ago" (short form on narrow screens, where the
  // activity bars share the row). Reserved as a blank line until the time is known.
  const lastDate = hasUpdates ? new Date(all[0].createdAt) : null
  const lastKnown = ready && lastDate && !Number.isNaN(lastDate.getTime())
  const description = !hasUpdates ? undefined : lastKnown ? (
    <>
      Last update{' '}
      <span className="sm:hidden">{timeAgo(lastDate, { now })}</span>
      <span className="hidden sm:inline">{timeAgo(lastDate, { long: true, now })}</span>
    </>
  ) : (
    '\u00A0'
  )

  function handleFilter(next) {
    if (next === activeFilter) return
    setFilter(next)
    setShowAll(false)
    setEnterFrom(0)
  }

  function handleToggle() {
    setShowAll(!showAll)
    setEnterFrom(showAll ? null : INITIAL_COUNT)
  }

  return (
    <Card as="section" aria-labelledby="updates-title">
      <CardHeader
        icon={Activity}
        titleId="updates-title"
        title="Recent updates"
        description={description}
        aside={activity?.total > 0 ? <ActivityBars counts={activity.counts} total={activity.total} /> : undefined}
      />
      <CardBody>
        {hasUpdates ? (
          <>
            {showFilter && (
              <FilterBar value={activeFilter} counts={counts} onChange={handleFilter} controlsId={listId} />
            )}

            {/* key: switching filter remounts the list so every entry animates in. */}
            <div key={activeFilter} id={listId}>
              {groups.map((group, groupIndex) => (
                <div key={group.items[0].id} className="mt-7 first:mt-0">
                  <Eyebrow
                    as="h3"
                    className={cn('mb-3 text-[11px]', group.isToday && 'text-fp-portal-text-primary')}
                  >
                    {group.label || '\u00A0'}
                  </Eyebrow>
                  <ol>
                    {group.items.map((update, position) => {
                      const index = indexById.get(update.id)
                      const enterStep =
                        enterFrom !== null && index >= enterFrom
                          ? Math.min(index - enterFrom, MAX_STAGGER_STEPS)
                          : null
                      const isEndOfDay = position === group.items.length - 1
                      const entryProps = {
                        update,
                        ready,
                        enterStep,
                        isLatest: update.id === latestId,
                        // The very last entry keeps its rail when "earlier updates" follow.
                        isLast: isEndOfDay && !(railContinues && groupIndex === groups.length - 1),
                      }
                      return isDeploy(update) ? (
                        <DeployEntry key={update.id} {...entryProps} />
                      ) : (
                        <StatusEntry key={update.id} {...entryProps} />
                      )
                    })}
                  </ol>
                </div>
              ))}
            </div>

            {hiddenCount > 0 && (
              <HistoryToggle
                expanded={showAll}
                hiddenCount={hiddenCount}
                onToggle={handleToggle}
                controlsId={listId}
              />
            )}
          </>
        ) : (
          <EmptyState
            icon={Activity}
            title="No updates yet"
            description="Your developer will post updates here as work progresses."
          />
        )}
      </CardBody>
    </Card>
  )
}