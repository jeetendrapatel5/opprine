// components/portal/InvoicePanel.jsx
// The client's invoices.
//
// Client Component because it has to notice a payment: the client pays on
// Stripe's hosted page, the webhook marks the invoice PAID, and the client
// comes back to server-rendered HTML that still says UNPAID. While any invoice
// is UNPAID we poll router.refresh() every 15 s, which re-runs the parent
// Server Component and passes fresh props down. Props are used directly (no
// useState) so every refresh renders the new data; polling stops by itself
// once nothing is UNPAID.
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, CheckCircle2, ExternalLink, Receipt } from 'lucide-react'
import { formatDate } from '@/components/dashboard/requests/request-format'
import { formatCurrency } from '@/lib/portal-format'
import { Badge, Button, Card, CardHeader } from './ui'

function isOverdue(date) {
  if (!date) return false
  return new Date(date) < new Date()
}

function InvoiceRow({ invoice }) {
  const isPaid = invoice.status === 'PAID'
  const overdue = !isPaid && isOverdue(invoice.dueDate)

  return (
    <li className="px-5 py-5 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-semibold text-fp-portal-text-primary">{invoice.number}</p>
          {invoice.milestone?.title && (
            <p className="mt-0.5 truncate text-xs text-fp-portal-text-muted">{invoice.milestone.title}</p>
          )}
        </div>

        {isPaid ? (
          <Badge tone="success">Paid</Badge>
        ) : (
          <Badge tone={overdue ? 'danger' : 'accent'}>{overdue ? 'Overdue' : 'Unpaid'}</Badge>
        )}
      </div>

      <p
        className={`mt-3 font-display text-3xl font-medium tabular-nums ${
          isPaid ? 'text-fp-portal-text-muted' : 'text-fp-portal-text-primary'
        }`}
      >
        {formatCurrency(invoice.amount, invoice.currency)}
      </p>

      {invoice.note && <p className="mt-2 text-sm leading-relaxed text-fp-portal-text-secondary">{invoice.note}</p>}

      {isPaid && invoice.paidAt && (
        <p className="mt-2 text-xs text-fp-portal-success">Paid on {formatDate(invoice.paidAt)}</p>
      )}
      {!isPaid && invoice.dueDate && (
        <p
          className={`mt-2 flex items-center gap-1.5 text-xs ${
            overdue ? 'font-medium text-fp-portal-danger' : 'text-fp-portal-text-muted'
          }`}
        >
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          {overdue ? 'Was due' : 'Due'} {formatDate(invoice.dueDate)}
        </p>
      )}

      {/* Plain link to Stripe's hosted payment page. */}
      {!isPaid && invoice.stripePaymentLinkUrl && (
        <Button
          variant="primary"
          icon={ExternalLink}
          href={invoice.stripePaymentLinkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 w-full"
        >
          Pay now
        </Button>
      )}

      {isPaid && (
        <p className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-fp-portal-success/8 py-2.5 text-sm font-semibold text-fp-portal-success">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Payment received
        </p>
      )}
    </li>
  )
}

export default function InvoicePanel({ invoices = [] }) {
  const router = useRouter()

  const hasUnpaid = invoices.some((inv) => inv.status === 'UNPAID')

  useEffect(() => {
    if (!hasUnpaid) return

    const interval = setInterval(() => {
      router.refresh()
    }, 15_000)

    return () => clearInterval(interval)
  }, [hasUnpaid, router])

  // Clients don't need to see administrative cancellations.
  const visible = invoices.filter((inv) => inv.status !== 'CANCELLED')
  if (visible.length === 0) return null

  return (
    <Card as="section" id="invoices" aria-labelledby="invoices-title" className="scroll-mt-28 overflow-hidden md:scroll-mt-20">
      <CardHeader icon={Receipt} titleId="invoices-title" title="Invoices" description="Secure payments via Stripe" />
      <ul className="divide-y divide-fp-portal-border">
        {visible.map((invoice) => (
          <InvoiceRow key={invoice.id} invoice={invoice} />
        ))}
      </ul>
    </Card>
  )
}
