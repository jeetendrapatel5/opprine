// components/portal/InvoicePanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Shows the client their invoices. Renders nothing if all invoices are
// CANCELLED — clients don't need to know about administrative cancellations.
//
// Design changes from old version:
// - Was dark (#0e0e12) — now fp-portal-surface (white card).
// - "Pay Now" button uses fp-portal-accent (amber) — warm gold signals
//   value and is more appropriate for a payment CTA than generic blue.
// - Invoice amounts use font-display (Fraunces) — numbers in a serif font
//   look more like a proper invoice and less like a web form.
// - Status badges use portal semantic tokens (fp-portal-success, fp-portal-danger).
//
// Server Component — "Pay Now" is a plain <a> tag linking to Stripe's hosted
// page. No client-side JS needed for the payment flow.
// ─────────────────────────────────────────────────────────────────────────────

function formatCurrency(amount, currency) {
  return new Intl.NumberFormat('en-US', {
    style:    'currency',
    currency: currency ?? 'USD',
  }).format(amount)
}

function formatDate(date) {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function isOverdue(date) {
  if (!date) return false
  return new Date(date) < new Date()
}

export default function InvoicePanel({ invoices = [] }) {
  const visible = invoices.filter(inv => inv.status !== 'CANCELLED')
  if (visible.length === 0) return null

  return (
    <div className="bg-fp-portal-surface border border-fp-portal-border rounded-xl overflow-hidden">

      {/* Section header */}
      <div className="px-5 pt-5 pb-3 border-b border-fp-portal-border">
        <h2 className="text-fp-portal-text-primary text-sm font-semibold">
          Invoices
        </h2>
        <p className="text-fp-portal-text-tertiary text-xs mt-0.5">
          Secure payments via Stripe
        </p>
      </div>

      {/* Invoice rows */}
      <div className="divide-y divide-fp-portal-border">
        {visible.map((invoice) => {
          const isPaid   = invoice.status === 'PAID'
          const overdue  = !isPaid && isOverdue(invoice.dueDate)

          return (
            <div key={invoice.id} className="px-5 py-4">

              {/* Top row: invoice number + milestone tag + status badge */}
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-fp-portal-text-primary text-sm font-bold font-mono truncate">
                    {invoice.number}
                  </p>
                  {invoice.milestone?.title && (
                    <span className="
                      text-[10px] px-1.5 py-0.5 rounded-full
                      bg-fp-portal-raised text-fp-portal-text-tertiary shrink-0
                    ">
                      {invoice.milestone.title}
                    </span>
                  )}
                </div>

                {/* Status badge */}
                {isPaid ? (
                  <span className="
                    text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0
                    bg-fp-portal-success/10 text-fp-portal-success
                  ">
                    Paid ✓
                  </span>
                ) : (
                  <span className={`
                    text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0
                    ${overdue
                      ? 'bg-fp-portal-danger/10 text-fp-portal-danger'
                      : 'bg-fp-portal-accent/10 text-fp-portal-accent'
                    }
                  `}>
                    {overdue ? 'Overdue' : 'Unpaid'}
                  </span>
                )}
              </div>

              {/* Amount — Fraunces for the number, makes it feel like a real invoice */}
              <p className={`
                font-display text-xl font-medium mb-1
                ${isPaid ? 'text-fp-portal-text-tertiary' : 'text-fp-portal-text-primary'}
              `}>
                {formatCurrency(invoice.amount, invoice.currency)}
              </p>

              {/* Note from freelancer */}
              {invoice.note && (
                <p className="text-fp-portal-text-secondary text-xs mb-2 leading-relaxed">
                  {invoice.note}
                </p>
              )}

              {/* Due / paid date */}
              {isPaid && invoice.paidAt && (
                <p className="text-xs text-fp-portal-success mb-3">
                  Paid on {formatDate(invoice.paidAt)}
                </p>
              )}
              {!isPaid && invoice.dueDate && (
                <p className={`text-xs mb-3 ${overdue ? 'text-fp-portal-danger' : 'text-fp-portal-text-tertiary'}`}>
                  {overdue ? 'Was due' : 'Due'} {formatDate(invoice.dueDate)}
                </p>
              )}

              {/* Pay Now — plain <a> → Stripe hosted page */}
              {!isPaid && invoice.stripePaymentLinkUrl && (
                <a
                  href={invoice.stripePaymentLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    block text-center text-sm font-bold py-2.5 rounded-xl
                    bg-fp-portal-accent hover:bg-fp-portal-accent-hover
                    text-white transition-colors duration-150
                  "
                >
                  Pay Now →
                </a>
              )}

              {/* Paid confirmation strip */}
              {isPaid && (
                <div className="
                  flex items-center justify-center gap-2 py-2.5 rounded-xl
                  bg-fp-portal-success/8 text-fp-portal-success text-sm font-semibold
                ">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
                    <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Payment Received
                </div>
              )}

            </div>
          )
        })}
      </div>
    </div>
  )
}