'use client'

import { memo, useState } from 'react'
import { getUpdateStatus } from './updateStatus'

const LONG_TEXT_THRESHOLD = 320

function formatDate(value) {
  const date = new Date(value)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

const UpdateItem = memo(function UpdateItem({ update, isLast }) {
  const [expanded, setExpanded] = useState(false)
  const status = getUpdateStatus(update.status)
  const isLong = update.text.length > LONG_TEXT_THRESHOLD

  return (
    <li className="flex gap-3">
      {/* Rail: the line is flex-1, so it always spans to the next dot */}
      <div className="flex w-3 shrink-0 flex-col items-center pt-1.5">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ring-4 ring-fp-surface ${status.dot}`}
          aria-hidden="true"
        />
        {!isLast && <span className="mt-1 w-px flex-1 bg-fp-border" aria-hidden="true" />}
      </div>

      <div className={`min-w-0 flex-1 ${isLast ? '' : 'pb-5'}`}>
        <div className="flex items-baseline gap-2 text-[11px]">
          <span className={`font-semibold ${status.text}`}>{status.label}</span>
          <span className="text-fp-text-tertiary" aria-hidden="true">·</span>
          <time
            dateTime={new Date(update.createdAt).toISOString()}
            title={new Date(update.createdAt).toLocaleString('en-GB')}
            className="text-fp-text-tertiary"
          >
            {formatDate(update.createdAt)}
          </time>
        </div>

        <p
          className={`mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-fp-text-secondary ${
            isLong && !expanded ? 'line-clamp-5' : ''
          }`}
        >
          {update.text}
        </p>

        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mt-1 text-xs font-medium text-fp-accent transition-colors hover:text-fp-accent-hover"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    </li>
  )
})

export default function UpdateTimeline({ updates, scrollRef }) {
  if (updates.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-fp-text-tertiary">
        No updates yet. Post your first one above to keep the client in the loop.
      </p>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="max-h-[420px] overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:var(--color-fp-border)_transparent]"
    >
      <ol>
        {updates.map((update, index) => (
          <UpdateItem key={update.id} update={update} isLast={index === updates.length - 1} />
        ))}
      </ol>
    </div>
  )
}