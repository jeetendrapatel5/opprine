// components/dashboard/invoices/InvoiceList.jsx
'use client'

// Displays the list of invoices for a project.
// Shows status badge, amount, due date, and a link to the Stripe payment page.
//
// Props:
//   invoices — array of invoice objects from Prisma
//   onCancel — function(invoiceId) — called when freelancer cancels an invoice
//   canEdit  — NEW — boolean, from the matrix's 'editInvoices' action.
//              true for Owner/Admin only. Gates ONLY the Cancel button —
//              Copy link and Preview stay available to a PM (viewInvoices:
//              true), since those are read actions, not edits.

import { useState } from 'react'
import { ExternalLink, XCircle, Loader2, Copy, CheckCircle2 } from 'lucide-react'
import axios from 'axios'

const statusConfig = {
  UNPAID: {
    label: 'Unpaid',
    className: 'bg-amber-50 text-amber-700',
  },
  PAID: {
    label: 'Paid',
    className: 'bg-emerald-50 text-emerald-700',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-500',
  },
}

// Formats a number as currency.
// e.g. formatCurrency(2500, 'USD') → "$2,500.00"
// Intl.NumberFormat is built into JavaScript — no library needed.
function formatCurrency(amount, currency) {
  return new Intl.NumberFormat('en-US', {
    style:    'currency',
    currency: currency ?? 'USD',
  }).format(amount)
}

function formatDate(date) {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-GB', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  })
}

// Individual invoice row
function InvoiceRow({ invoice, onCancel, canEdit }) {
  const [isCancelling, setIsCancelling] = useState(false)
  const [copied,       setCopied]       = useState(false)
  const status = statusConfig[invoice.status] ?? statusConfig.UNPAID

  const handleCancel = async () => {
    // NEW — guard the function too, not just the button below.
    if (!canEdit) return
    if (!confirm(`Cancel invoice ${invoice.number}? This cannot be undone.`)) return
    setIsCancelling(true)
    try {
      await axios.patch(`/api/invoices/${invoice.id}`, { status: 'CANCELLED' })
      onCancel(invoice.id)
    } catch {
      alert('Failed to cancel invoice. Please try again.')
    } finally {
      setIsCancelling(false)
    }
  }

  const copyPaymentLink = async () => {
    // BUG FIX: clipboard API can fail on HTTP (non-HTTPS) or in certain browsers.
    // Always wrap in try/catch to avoid an unhandled promise rejection crashing the UI.
    try {
      await navigator.clipboard.writeText(invoice.stripePaymentLinkUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select + copy for older browsers
      alert('Could not copy automatically. URL: ' + invoice.stripePaymentLinkUrl)
    }
  }

  return (
    <div className={`bg-fp-base rounded-2xl p-4 ${
      invoice.status === 'CANCELLED' ? 'opacity-50' : ''
    }`}>

      {/* Top row — number + status + amount */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-400">{invoice.number}</p>
            <span className={`text-[13px] bg-transparent font-bold px-2 py-0.5 rounded-full ${status.className}`}>
              {status.label}
            </span>
          </div>
          {invoice.milestone && (
            <p className="text-xs text-gray-400 mt-0.5">
              For: {invoice.milestone.title}
            </p>
          )}
          {invoice.note && (
            <p className="text-xs text-gray-500 mt-1">"{invoice.note}"</p>
          )}
        </div>
        <p className="text-base font-bold text-gray-400 shrink-0">
          {formatCurrency(invoice.amount, invoice.currency)}
        </p>
      </div>

      {/* Bottom row — due date + actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          {invoice.dueDate && (
            <p className="text-xs text-gray-400">
              Due {formatDate(invoice.dueDate)}
            </p>
          )}
          {invoice.paidAt && (
            <p className="text-xs text-emerald-600 font-medium">
              Paid {formatDate(invoice.paidAt)}
            </p>
          )}
        </div>

        {/* Actions — only shown for UNPAID invoices */}
        {invoice.status === 'UNPAID' && (
          <div className="flex items-center gap-2">

            {/* Copy payment link — unchanged, available regardless of
                canEdit. This is a read action: it copies a link that
                already exists, it doesn't change invoice state. A PM
                with view-only invoice access should still be able to
                grab the link to send to the client themselves. */}
            {invoice.stripePaymentLinkUrl && (
              <button
                onClick={copyPaymentLink}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-indigo-600 transition-colors"
                title="Copy payment link"
              >
                {copied
                  ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Copied</>
                  : <><Copy         className="w-3.5 h-3.5" /> Copy link</>
                }
              </button>
            )}

            {/* Open in Stripe — unchanged, same reasoning as Copy link. */}
            {invoice.stripePaymentLinkUrl && (
              <a
                href={invoice.stripePaymentLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-indigo-600 transition-colors"
                title="Open payment page"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Preview
              </a>
            )}

            {/* CHANGED — Cancel is the one action that actually
                changes invoice state (editInvoices), so it's the only
                one hidden without canEdit. A PM sees the invoice,
                sees the payment link, just can't cancel it. */}
            {canEdit && (
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors"
                title="Cancel this invoice"
              >
                {isCancelling
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <XCircle className="w-3.5 h-3.5" />
                }
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function InvoiceList({ invoices = [], onCancel, canEdit = false }) {
  if (invoices.length === 0) {
    return (
      <div className="text-center py-10 bg-fp-base rounded-2xl">
        <p className="text-sm text-gray-400">No invoices yet.</p>
        {/* CHANGED — the old copy assumed the reader can create one.
            A PM sees this same empty state and shouldn't be told to
            click a button that isn't there for them. */}
        <p className="text-xs text-gray-400 mt-1">
          {canEdit
            ? 'Create your first invoice using the button above.'
            : 'No invoices have been created for this project yet.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {invoices.map((invoice) => (
        <InvoiceRow
          key={invoice.id}
          invoice={invoice}
          onCancel={onCancel}
          canEdit={canEdit}
        />
      ))}
    </div>
  )
}