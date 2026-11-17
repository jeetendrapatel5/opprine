// components/portal/ActionPanel.jsx
// Sign-off on legacy Update items (status IN_REVIEW). Milestone approvals live
// in ProjectMilestones -> DeliveryCard. Renders nothing when there is no work
// waiting on the client.
'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, Paperclip, XCircle } from 'lucide-react'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import { formatSize } from '@/components/dashboard/requests/request-format'
import { timeAgo } from '@/lib/portal-format'
import { Badge, Button, Card, Eyebrow, FieldLabel, IconTile, controlClass, focusRing } from './ui'

// The milestone's work-log entries, so the client can see what was done.
function WorkContext({ updates }) {
  if (!updates || updates.length === 0) return null

  return (
    <div className="mt-4 border-t border-fp-portal-border pt-4">
      <Eyebrow className="mb-3">What was done</Eyebrow>
      <ul className="space-y-3">
        {updates.map((u) => (
          <li key={u.id} className="flex items-start gap-3">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-fp-portal-accent" />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-relaxed text-fp-portal-text-primary">{u.note}</p>
              {u.fileUrl && (
                <div className="mt-2">
                  {u.fileType?.startsWith('image/') ? (
                    <a href={u.fileUrl} target="_blank" rel="noopener noreferrer" className={`inline-block rounded-lg ${focusRing}`}>
                      <img
                        src={u.fileUrl}
                        alt={u.fileName ?? 'Attached image'}
                        className="max-h-40 cursor-zoom-in rounded-lg border border-fp-portal-border object-cover transition-opacity hover:opacity-90"
                      />
                    </a>
                  ) : (
                    <a
                      href={u.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex max-w-full items-center gap-1.5 rounded-lg border border-fp-portal-border bg-fp-portal-raised px-2.5 py-1.5 text-xs font-medium text-fp-portal-text-secondary transition-colors hover:text-fp-portal-text-primary ${focusRing}`}
                    >
                      <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{u.fileName}</span>
                      {u.fileSize && <span className="shrink-0 text-fp-portal-text-muted">{formatSize(u.fileSize)}</span>}
                    </a>
                  )}
                </div>
              )}
              <p className="mt-1 text-xs text-fp-portal-text-muted">{timeAgo(u.createdAt)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ActionPanel({ items, token }) {
  const [loadingId, setLoadingId] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const router = useRouter()

  if (items.length === 0) return null

  // Milestones have 'title'. Legacy Updates have 'text'.
  const getType = (item) => (item.title ? 'milestone' : 'update')

  const handleApprove = async (itemId, type) => {
    setLoadingId(itemId)
    try {
      await axios.patch(`/api/portal/${token}/approve`, { itemId, type, action: 'approve' })
      router.refresh()
    } catch {
      alert('Failed to approve. Please try again.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleReject = async (itemId, type) => {
    if (!rejectReason.trim()) {
      alert('Please describe what needs to change.')
      return
    }
    setLoadingId(itemId)
    try {
      await axios.patch(`/api/portal/${token}/approve`, {
        itemId,
        type,
        action: 'reject',
        reason: rejectReason.trim(),
      })
      setRejectingId(null)
      setRejectReason('')
      router.refresh()
    } catch {
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <Card
      as="section"
      aria-labelledby="review-title"
      className="border-fp-portal-accent/30 bg-fp-portal-accent/5 p-4 sm:p-6"
    >
      <div className="mb-4 flex items-center gap-3">
        <IconTile icon={AlertCircle} />
        <h2 id="review-title" className="text-base font-semibold text-fp-portal-text-primary">
          Awaiting your review
        </h2>
        <Badge tone="accent">{items.length}</Badge>
      </div>

      <ul className="space-y-3">
        {items.map((item) => {
          const type = getType(item)
          const isRejecting = rejectingId === item.id
          const isLoading = loadingId === item.id
          const workLog = item.milestoneUpdates ?? []
          const reasonId = `reject-reason-${item.id}`

          return (
            <li key={item.id}>
              <Card className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold leading-snug text-fp-portal-text-primary">
                      {item.title || item.text}
                    </h3>
                    <p className="mt-1 text-sm text-fp-portal-text-secondary">Ready for your sign-off</p>
                  </div>

                  <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row">
                    <Button
                      icon={XCircle}
                      disabled={isLoading}
                      onClick={() => {
                        setRejectingId(isRejecting ? null : item.id)
                        setRejectReason('')
                      }}
                    >
                      {isRejecting ? 'Cancel' : 'Request changes'}
                    </Button>
                    <Button
                      variant="success"
                      icon={CheckCircle2}
                      loading={isLoading && !isRejecting}
                      disabled={isRejecting}
                      onClick={() => handleApprove(item.id, type)}
                    >
                      Approve
                    </Button>
                  </div>
                </div>

                <WorkContext updates={workLog} />

                {isRejecting && (
                  <div className="mt-4 border-t border-fp-portal-border pt-4">
                    <FieldLabel htmlFor={reasonId}>What needs to change?</FieldLabel>
                    <textarea
                      id={reasonId}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. The colour scheme doesn't match our brand. Please use our navy blue."
                      rows={3}
                      className={controlClass}
                    />
                    <Button
                      variant="danger"
                      className="mt-3 w-full sm:w-auto"
                      loading={isLoading}
                      disabled={!rejectReason.trim()}
                      onClick={() => handleReject(item.id, type)}
                    >
                      Submit feedback
                    </Button>
                  </div>
                )}
              </Card>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
