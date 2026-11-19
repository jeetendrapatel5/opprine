// components/portal/UpdateFeed.jsx
// Project-level update log: the legacy Update model plus auto-generated deploy
// notes. Shows the latest few; the rest sit behind "Show earlier updates".
'use client'

import { useState } from 'react'

import { Activity, ExternalLink, Rocket } from 'lucide-react'
import { timeAgo } from '@/lib/portal-format'
import { Button, Card, CardBody, CardHeader, EmptyState, focusRing } from './ui'

const STATUS = {
  IN_PROGRESS: { label: 'In progress', dot: 'bg-fp-portal-accent',  text: 'text-fp-portal-accent-strong' },
  IN_REVIEW:   { label: 'In review',   dot: 'bg-fp-portal-accent',  text: 'text-fp-portal-accent-strong' },
  DONE:        { label: 'Completed',   dot: 'bg-fp-portal-success', text: 'text-fp-portal-success' },
}

function Timestamp({ date }) {
  return (
    <time dateTime={new Date(date).toISOString()} className="text-xs text-fp-portal-text-muted">
      {timeAgo(date, { long: true })}
    </time>
  )
}

// Entry rail: a hairline runs down the list and each marker sits on it.
const ENTRY = 'relative pb-5 pl-7 last:pb-0'
const MARKER = 'absolute -left-2.5 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-fp-portal-surface'

// Auto-generated from a deploy (AI-summarised commits).
function DeployEntry({ update }) {
  return (
    <li className={ENTRY}>
      <span aria-hidden="true" className={MARKER}>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-fp-portal-raised text-fp-portal-text-secondary">
          <Rocket className="h-3 w-3" />
        </span>
      </span>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <p className="text-xs font-semibold text-fp-portal-text-secondary">Deployed</p>
        <Timestamp date={update.createdAt} />
      </div>
      <p className="mt-1 text-sm leading-relaxed text-fp-portal-text-primary">{update.text}</p>
      {(update.commitSha || update.previewUrl) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {update.commitSha && (
            <code className="rounded bg-fp-portal-raised px-1.5 py-0.5 font-mono text-xs text-fp-portal-text-secondary">
              {update.commitSha.slice(0, 7)}
            </code>
          )}
          {update.previewUrl && (
            <a
              href={update.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 rounded text-xs font-semibold text-fp-portal-accent-strong hover:underline ${focusRing}`}
            >
              Preview <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>
      )}
    </li>
  )
}

function StatusEntry({ update }) {
  const status = STATUS[update.status] ?? STATUS.IN_PROGRESS

  return (
    <li className={ENTRY}>
      <span aria-hidden="true" className={MARKER}>
        <span className={`h-2 w-2 rounded-full ${status.dot}`} />
      </span>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <p className={`text-xs font-semibold ${status.text}`}>{status.label}</p>
        <Timestamp date={update.createdAt} />
      </div>
      <p className="mt-1 text-sm leading-relaxed text-fp-portal-text-primary">{update.text}</p>
    </li>
  )
}

const INITIAL_COUNT = 4

export default function UpdateFeed({ updates }) {
  const [showAll, setShowAll] = useState(false)
  const hasUpdates = updates && updates.length > 0
  const visible = hasUpdates && !showAll ? updates.slice(0, INITIAL_COUNT) : updates
  const hiddenCount = hasUpdates ? updates.length - INITIAL_COUNT : 0

  return (
    <Card as="section" aria-labelledby="updates-title">
      <CardHeader icon={Activity} titleId="updates-title" title="Recent updates" />
      <CardBody>
        {hasUpdates ? (
          <>
            <ul className="ml-2.5 border-l border-fp-portal-border">
              {visible.map((update) =>
                update.type === 'AUTO_DEPLOY' ? (
                  <DeployEntry key={update.id} update={update} />
                ) : (
                  <StatusEntry key={update.id} update={update} />
                ),
              )}
            </ul>
            {hiddenCount > 0 && (
              <Button className="mt-4 w-full" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
                {showAll ? 'Show fewer updates' : `Show earlier updates (${hiddenCount})`}
              </Button>
            )}
          </>
        ) : (
          <EmptyState
            title="No updates yet"
            description="Your developer will post updates here as work progresses."
          />
        )}
      </CardBody>
    </Card>
  )
}
