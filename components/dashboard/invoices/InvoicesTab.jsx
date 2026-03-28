// components/dashboard/invoices/InvoicesTab.jsx
'use client'

import { useState } from 'react'
import InvoiceForm from './InvoiceForm'
import InvoiceList from './InvoiceList'

// Props:
//   project — full project object including project.invoices and project.milestones

export default function InvoicesTab({ project }) {
  // invoices lives in local state — InvoiceForm adds to it, cancel removes from it
  const [invoices, setInvoices] = useState(project.invoices ?? [])

  const handleNewInvoice = (newInvoice) => {
    setInvoices(prev => [newInvoice, ...prev])
  }

  const handleCancel = (invoiceId) => {
    setInvoices(prev =>
      prev.map(inv => inv.id === invoiceId ? { ...inv, status: 'CANCELLED' } : inv)
    )
  }

  return (
    <div className="space-y-5">
      {/* Header row — title + create button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Invoices</h3>
          <p className="text-xs text-gray-500 mt-0.5">
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