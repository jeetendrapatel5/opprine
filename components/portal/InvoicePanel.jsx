// components/portal/InvoicePanel.jsx
//
// SERVER COMPONENT — no interactivity needed.
// The "Pay Now" button is just an anchor tag linking to Stripe's hosted page.
// No API calls from this component, no state, no 'use client'.
//
// Props:
//   invoices — array of invoice objects from Prisma
//              each has: id, number, amount, currency, status,
//              dueDate, note, stripePaymentLinkUrl, paidAt, milestone

// Formats a number as currency using the browser's built-in formatter.
// e.g. formatCurrency(2500, 'USD') → "$2,500.00"
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

// Checks if a due date has passed.
// Used to show "Overdue" in red instead of the normal date.
function isOverdue(date) {
  if (!date) return false
  return new Date(date) < new Date()
}

export default function InvoicePanel({ invoices = [] }) {
  // Only show invoices that are UNPAID or PAID.
  // CANCELLED invoices are hidden from the client — they don't need to
  // know about administrative cancellations.
  const visible = invoices.filter(inv => inv.status !== 'CANCELLED')

  if (visible.length === 0) return null

  return (
    <div
      className="rounded-2xl border border-white/5 overflow-hidden"
      style={{ background: '#0e0e12' }}
    >
      {/* Section header */}
      <div className="px-5 pt-5 pb-3 border-b border-white/5">
        <h2
          className="text-sm font-semibold text-white"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          Invoices
        </h2>
        <p
          className="text-xs mt-0.5"
          style={{ color: '#6b7280', fontFamily: 'DM Mono, monospace' }}
        >
          Secure payments via Stripe
        </p>
      </div>

      {/* Invoice list */}
      <div className="divide-y divide-white/5">
        {visible.map((invoice) => {
          const isPaid    = invoice.status === 'PAID'
          const overdue   = !isPaid && isOverdue(invoice.dueDate)

          return (
            <div key={invoice.id} className="px-5 py-4">

              {/* Top row — number + status badge */}
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <p
                    className="text-sm font-bold text-white truncate"
                    style={{ fontFamily: 'DM Mono, monospace' }}
                  >
                    {invoice.number}
                  </p>

                  {/* Milestone link label — shown if invoice is tied to a milestone */}
                  {invoice.milestone?.title && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        background: '#ffffff08',
                        color: '#9ca3af',
                        fontFamily: 'DM Mono, monospace',
                      }}
                    >
                      {invoice.milestone.title}
                    </span>
                  )}
                </div>

                {/* Status badge */}
                {isPaid ? (
                  <span
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0"
                    style={{
                      background: '#10b98120',
                      color: '#34d399',
                      fontFamily: 'DM Mono, monospace',
                    }}
                  >
                    Paid ✓
                  </span>
                ) : (
                  <span
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0"
                    style={{
                      background: overdue ? '#ef444420' : '#F59E0B20',
                      color:      overdue ? '#f87171'   : '#F59E0B',
                      fontFamily: 'DM Mono, monospace',
                    }}
                  >
                    {overdue ? 'Overdue' : 'Unpaid'}
                  </span>
                )}
              </div>

              {/* Amount */}
              <p
                className="text-xl font-bold mb-1"
                style={{
                  color:      isPaid ? '#6b7280' : '#ffffff',
                  fontFamily: 'Fraunces, Georgia, serif',
                  textDecoration: isPaid ? 'none' : 'none',
                }}
              >
                {formatCurrency(invoice.amount, invoice.currency)}
              </p>

              {/* Note from freelancer */}
              {invoice.note && (
                <p
                  className="text-xs mb-2 leading-relaxed"
                  style={{ color: '#9ca3af', fontFamily: 'DM Sans, sans-serif' }}
                >
                  {invoice.note}
                </p>
              )}

              {/* Due date / paid date */}
              {isPaid && invoice.paidAt && (
                <p
                  className="text-xs mb-3"
                  style={{ color: '#34d399', fontFamily: 'DM Mono, monospace' }}
                >
                  Paid on {formatDate(invoice.paidAt)}
                </p>
              )}

              {!isPaid && invoice.dueDate && (
                <p
                  className="text-xs mb-3"
                  style={{
                    color:      overdue ? '#f87171' : '#6b7280',
                    fontFamily: 'DM Mono, monospace',
                  }}
                >
                  {overdue ? 'Was due' : 'Due'} {formatDate(invoice.dueDate)}
                </p>
              )}

              {/* Pay Now button — only for UNPAID invoices with a payment link */}
              {/* This is a plain <a> tag — clicking it opens Stripe's hosted  */}
              {/* payment page. No JavaScript needed. No API call from portal. */}
              {!isPaid && invoice.stripePaymentLinkUrl && (
                
                <a href={invoice.stripePaymentLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-sm font-bold py-2.5 rounded-xl transition-all hover:opacity-90"
                  style={{
                    background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
                    color:      '#000000',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  Pay Now →
                </a>
              )}

              {/* Paid state — no button, just a visual confirmation */}
              {isPaid && (
                <div
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                  style={{
                    background: '#10b98110',
                    color:      '#34d399',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
                    <path
                      d="M3 8l3.5 3.5L13 4.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Payment received
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}