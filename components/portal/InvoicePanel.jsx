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
import { formatCurrency, summarizeInvoices } from '@/lib/portal-format'
import { Badge, Button, Card, CardBody, EmptyState } from './ui'

function isOverdue(date) {
  if (!date) return false
  return new Date(date) < new Date()
}

function InvoiceRow({ invoice }) {
  const isPaid = invoice.status === 'PAID'
  const overdue = !isPaid && isOverdue(invoice.dueDate)

  return (
    <li className="rounded-2xl border border-fp-portal-border bg-fp-portal-surface p-5 shadow-fp-card">
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

  if (visible.length === 0) {
    return (
      <Card as="section" aria-label="Invoices">
        <CardBody>
          <EmptyState icon={Receipt} title="No invoices yet" description="Invoices will appear here when they are issued." />
        </CardBody>
      </Card>
    )
  }

  const { overdueCount, outstandingText, paidText } = summarizeInvoices(visible)

  const tiles = [
    { label: 'Outstanding', value: outstandingText, hint: overdueCount ? `${overdueCount} overdue` : 'Nothing overdue', warn: overdueCount > 0 },
    { label: 'Paid', value: paidText, hint: 'Payments received' },
  ]

  return (
    <section aria-label="Invoices" className="space-y-5">
      <dl className="grid gap-4 sm:grid-cols-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border border-fp-portal-border bg-fp-portal-surface p-5 shadow-fp-card">
            <dt className="text-xs font-semibold uppercase tracking-widest text-fp-portal-text-muted">{t.label}</dt>
            <dd className="mt-2 font-display text-3xl font-medium tabular-nums text-fp-portal-text-primary">{t.value}</dd>
            <p className={`mt-1 text-xs ${t.warn ? 'font-medium text-fp-portal-danger' : 'text-fp-portal-text-secondary'}`}>
              {t.hint}
            </p>
          </div>
        ))}
      </dl>

      <ul className="grid gap-4 md:grid-cols-2">
        {visible.map((invoice) => (
          <InvoiceRow key={invoice.id} invoice={invoice} />
        ))}
      </ul>
      <p className="text-center text-xs text-fp-portal-text-muted">Secure payments via Stripe</p>
    </section>
  )
}
