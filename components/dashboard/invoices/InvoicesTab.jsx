// components/dashboard/invoices/InvoicesTab.jsx
'use client'

import { useState, useEffect } from 'react'
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
  // When router.refresh() runs, Next.js re-renders the parent Server Component
  // and passes fresh project.invoices down as a new prop.
  // Without this effect, useState stays frozen on the original mount value
  // and the fresh data is silently ignored.
  useEffect(() => {
    setInvoices(project.invoices ?? [])
  }, [project.invoices])

  // ── Poll for payment status while any invoice is UNPAID ────────────────────
  // The Stripe webhook updates the DB, but the browser has no idea.
  // Every 15 seconds, if there's an UNPAID invoice, call router.refresh().
  // That re-runs the parent Server Component, fetches fresh DB data,
  // and the useEffect above syncs it into local state.
  // The interval clears itself when there are no UNPAID invoices left.
  useEffect(() => {
    const hasUnpaid = invoices.some((inv) => inv.status === 'UNPAID')
    if (!hasUnpaid) return // nothing to poll for

    const interval = setInterval(() => {
      router.refresh()
    }, 15_000) // 15 seconds — fast enough to feel responsive, slow enough to not spam

    return () => clearInterval(interval) // cleanup on unmount or when invoices change
  }, [invoices, router])

  // ── Handlers ───────────────────────────────────────────────────────────────

  // Called by InvoiceForm after a successful POST.
  // Optimistically adds the new invoice to the top of the list immediately —
  // no need to wait for a refresh cycle.
  const handleNewInvoice = (newInvoice) => {
    setInvoices((prev) => [newInvoice, ...prev])
  }

  // Called by InvoiceList when the freelancer cancels an invoice.
  // Optimistically marks it CANCELLED in local state.
  // The real DB update happens in InvoiceList's PATCH call.
  const handleCancel = (invoiceId) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId ? { ...inv, status: 'CANCELLED' } : inv
      )
    )
  }

  return (
    <div className="space-y-5">

      {/* Header row — title on the left, create button on the right */}
      {/* BUG FIX: was flex-col items-center which stacked vertically */}
      <div className="flex flex-row items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Invoices</h3>
          <p className="text-xs text-gray-500">
            Payment links are generated automatically via Stripe.
          </p>
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