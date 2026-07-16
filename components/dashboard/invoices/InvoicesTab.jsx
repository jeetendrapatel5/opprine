// components/dashboard/invoices/InvoicesTab.jsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import InvoiceForm from './InvoiceForm'
import InvoiceList from './InvoiceList'

// Props:
//   project — full project object including project.invoices and project.milestones

export default function InvoicesTab({ project }) {
  const router = useRouter()

  // Local state for optimistic updates (new invoice, cancel).
  // Initialized from the server-rendered prop.
  const [invoices, setInvoices] = useState(project.invoices ?? [])

  // ── Sync local state when server data refreshes ────────────────────────────
  useEffect(() => {
    setInvoices(project.invoices ?? [])
  }, [project.invoices])

  // Whether any invoice is still waiting on payment. Reused for two things:
  // deciding whether to poll below, and showing a small "syncing" hint so
  // the background refresh isn't an invisible, unexplained delay.
  const hasUnpaid = useMemo(
    () => invoices.some((inv) => inv.status === 'UNPAID'),
    [invoices],
  )

  // ── Poll for payment status while any invoice is UNPAID ────────────────────
  useEffect(() => {
    if (!hasUnpaid) return

    const interval = setInterval(() => {
      router.refresh()
    }, 15_000)

    return () => clearInterval(interval)
  }, [hasUnpaid, router])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleNewInvoice = (newInvoice) => {
    setInvoices((prev) => [newInvoice, ...prev])
  }

  const handleCancel = (invoiceId) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId ? { ...inv, status: 'CANCELLED' } : inv
      )
    )
  }

  // Counts only, not dollar totals — this file doesn't have visibility into
  // what field InvoiceForm/InvoiceList use for the invoice amount, so a
  // totals strip is left for a follow-up rather than guessed at (would risk
  // showing "$NaN" forever). Ask if you want that wired in.
  const summaryParts = useMemo(() => {
    const unpaid    = invoices.filter((inv) => inv.status === 'UNPAID').length
    const paid      = invoices.filter((inv) => inv.status === 'PAID').length
    const cancelled = invoices.filter((inv) => inv.status === 'CANCELLED').length

    return [
      unpaid > 0    && { label: `${unpaid} unpaid`, color: 'text-fp-warning' },
      paid > 0      && { label: `${paid} paid`, color: 'text-fp-success' },
      cancelled > 0 && { label: `${cancelled} cancelled`, color: 'text-fp-text-tertiary' },
    ].filter(Boolean)
  }, [invoices])

  return (
    <div className="space-y-5">

      {/* Header row — "Invoices" itself isn't repeated here, the tab bar
          right above this already says it; this row is left for the
          subtitle, live status summary, and the New Invoice button. */}
      <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-fp-text-tertiary">
            Payment links are generated automatically via Stripe.
          </p>
          {summaryParts.length > 0 && (
            <div className="flex items-center gap-2 mt-1.5 text-[11px] font-medium flex-wrap">
              {summaryParts.map((part, i) => (
                <span key={part.label} className="flex items-center gap-2">
                  {i > 0 && <span className="text-fp-border" aria-hidden="true">·</span>}
                  <span className={part.color}>{part.label}</span>
                </span>
              ))}
              {hasUnpaid && (
                <span className="flex items-center gap-1 text-fp-text-tertiary font-normal ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-fp-accent animate-pulse" aria-hidden="true" />
                  Syncing payment status
                </span>
              )}
            </div>
          )}
        </div>
        <InvoiceForm
          projectId={project.id}
          milestones={project.milestones ?? []}
          onSuccess={handleNewInvoice}
        />
      </div>

      <InvoiceList
        invoices={invoices}
        onCancel={handleCancel}
      />
    </div>
  )
}