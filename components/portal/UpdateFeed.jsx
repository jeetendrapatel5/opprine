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

// Auto-generated from a deploy (AI-summarised commits).
function DeployEntry({ update }) {
  return (
    <li className="flex gap-3 py-4 first:pt-0 last:pb-0">
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fp-portal-raised text-fp-portal-text-secondary"
      >
        <Rocket className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-fp-portal-text-secondary">Deployed</p>
        <p className="mt-1 text-sm leading-relaxed text-fp-portal-text-primary">{update.text}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Timestamp date={update.createdAt} />
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
      </div>
    </li>
  )
}

function StatusEntry({ update }) {
  const status = STATUS[update.status] ?? STATUS.IN_PROGRESS

  return (
    <li className="flex gap-3 py-4 first:pt-0 last:pb-0">
      <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center">
        <span className={`h-2 w-2 rounded-full ${status.dot}`} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-semibold ${status.text}`}>{status.label}</p>
        <p className="mt-1 text-sm leading-relaxed text-fp-portal-text-primary">{update.text}</p>
        <div className="mt-1.5">
          <Timestamp date={update.createdAt} />
        </div>
      </div>
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
            <ul className="divide-y divide-fp-portal-border">
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
