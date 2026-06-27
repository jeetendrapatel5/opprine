import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import InvoiceFilters from '@/components/InvoiceFilters'
import NewInvoiceModal from '@/components/NewInvoiceModal'
import CopyLinkButton from '@/components/CopyLinkButton'
import ExportCsvButton from '@/components/ExportCsvButton'
import {
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

// ── Helpers ──────────────────────────────────────────────────────────────

function isOverdue(invoice, now) {
  return invoice.status === 'UNPAID' && invoice.dueDate && new Date(invoice.dueDate) < now
}

function isSameMonth(date, ref) {
  const d = new Date(date)
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}

function getDominantCurrency(invoices) {
  if (invoices.length === 0) return 'USD'
  const counts = {}
  for (const inv of invoices) counts[inv.currency] = (counts[inv.currency] || 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

function getMonthlyBuckets(invoices, now, monthsBack = 6) {
  const buckets = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      total: 0,
    })
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]))
  for (const inv of invoices) {
    if (inv.status !== 'PAID' || !inv.paidAt) continue
    const d = new Date(inv.paidAt)
    const bucket = byKey.get(`${d.getFullYear()}-${d.getMonth()}`)
    if (bucket) bucket.total += inv.amount
  }
  return buckets
}

function formatCurrency(amount, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`
  }
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Presentational pieces (server-rendered, no interactivity needed) ─────

function Metric({ label, value, delta, warn }) {
  return (
    <div className="sm:px-6">
      <p className="text-fp-text-secondary text-xs font-semibold uppercase tracking-widest mb-2">
        {label}
      </p>
      <p
        className={`font-mono text-2xl sm:text-[28px] tracking-tight ${
          warn ? 'text-fp-warning' : 'text-fp-text-primary'
        }`}
      >
        {value}
      </p>
      {typeof delta === 'number' && (
        <p
          className={`mt-1.5 inline-flex items-center gap-1 text-xs font-medium ${
            delta >= 0 ? 'text-fp-accent-hover' : 'text-fp-text-tertiary'
          }`}
        >
          {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(delta).toFixed(0)}% vs last month
        </p>
      )}
    </div>
  )
}

function RevenueTrend({ buckets, currency }) {
  const max = Math.max(...buckets.map((b) => b.total), 1)
  const hasData = buckets.some((b) => b.total > 0)
  const width = 640
  const height = 140
  const gap = 18
  const barWidth = (width - gap * (buckets.length - 1)) / buckets.length

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height + 26}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <line x1="0" y1={height} x2={width} y2={height} className="stroke-fp-border" strokeWidth="1" />
        {buckets.map((b, i) => {
          const x = i * (barWidth + gap)
          const barHeight = hasData ? Math.max((b.total / max) * (height - 10), b.total > 0 ? 4 : 0) : 0
          const isCurrent = i === buckets.length - 1
          return (
            <g key={b.key}>
              <title>{`${b.label} — ${formatCurrency(b.total, currency)}`}</title>
              <rect
                x={x}
                y={height - barHeight}
                width={barWidth}
                height={barHeight}
                rx="3"
                className={isCurrent ? 'fill-fp-accent' : 'fill-fp-text-tertiary/15'}
              />
              <text
                x={x + barWidth / 2}
                y={height + 18}
                textAnchor="middle"
                className={
                  isCurrent
                    ? 'fill-fp-text-primary text-[11px] font-medium'
                    : 'fill-fp-text-tertiary text-[11px]'
                }
              >
                {b.label}
              </text>
            </g>
          )
        })}
      </svg>
      {!hasData && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-fp-text-tertiary pb-6">
          No revenue recorded yet
        </p>
      )}
    </div>
  )
}

function StatusIndicator({ invoice, overdue }) {
  if (invoice.status === 'PAID') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-fp-accent-hover">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Paid
      </span>
    )
  }
  if (invoice.status === 'CANCELLED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-fp-text-tertiary">
        <XCircle className="w-3.5 h-3.5" />
        Cancelled
      </span>
    )
  }
  if (overdue) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-fp-warning">
        <AlertCircle className="w-3.5 h-3.5" />
        Overdue
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-fp-text-secondary">
      <Clock className="w-3.5 h-3.5" />
      Unpaid
    </span>
  )
}

function EmptyState() {
  return (
    <div className="border border-dashed border-fp-border rounded-xl py-16 flex flex-col items-center justify-center">
      <div className="w-10 h-10 rounded-xl bg-fp-surface border border-fp-border flex items-center justify-center mb-4">
        <Receipt className="w-5 h-5 text-fp-text-tertiary" />
      </div>
      <p className="text-fp-text-primary text-sm font-medium mb-1">No invoices yet</p>
      <p className="text-fp-text-tertiary text-xs text-center max-w-[260px]">
        Create an invoice once a milestone is ready to bill. Your client gets a secure payment
        link — no account required.
      </p>
    </div>
  )
}

function NoResultsState() {
  return (
    <div className="border border-dashed border-fp-border rounded-xl py-14 flex flex-col items-center justify-center">
      <p className="text-fp-text-primary text-sm font-medium mb-1">No matching invoices</p>
      <p className="text-fp-text-tertiary text-xs">Try a different status or search term.</p>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────

export default async function InvoicesPage({ searchParams }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/signin')

  const params = await searchParams
  const statusFilter = params?.status ?? 'all'
  const query = (params?.q ?? '').trim()

  const [invoices, projects] = await Promise.all([
    prisma.invoice.findMany({
      where: { project: { userId: session.user.id } },
      include: {
        project: {
          select: { id: true, name: true, client: { select: { name: true, email: true } } },
        },
        milestone: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.project.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        milestones: { select: { id: true, title: true }, orderBy: { order: 'asc' } },
      },
      orderBy: { name: 'asc' },
    }),
  ])

  const now = new Date()
  const overdueAll = invoices.filter((i) => isOverdue(i, now))
  const unpaidNotOverdueAll = invoices.filter((i) => i.status === 'UNPAID' && !isOverdue(i, now))

  // Revenue figures are computed in whichever currency most of the
  // freelancer's invoices use — mixing currencies in one sum would lie.
  const dominantCurrency = getDominantCurrency(invoices)
  const primaryInvoices = invoices.filter((i) => i.currency === dominantCurrency)
  const otherCurrencyCount = invoices.length - primaryInvoices.length
  const otherCurrencyNote =
    otherCurrencyCount > 0
      ? `Totals in ${dominantCurrency} · ${otherCurrencyCount} invoice${otherCurrencyCount > 1 ? 's' : ''} in other currencies`
      : null

  const totalRevenue = primaryInvoices
    .filter((i) => i.status === 'PAID')
    .reduce((sum, i) => sum + i.amount, 0)

  const outstanding = primaryInvoices
    .filter((i) => i.status === 'UNPAID' && !isOverdue(i, now))
    .reduce((sum, i) => sum + i.amount, 0)

  const overdueAmount = primaryInvoices
    .filter((i) => isOverdue(i, now))
    .reduce((sum, i) => sum + i.amount, 0)

  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const thisMonthRevenue = primaryInvoices
    .filter((i) => i.status === 'PAID' && i.paidAt && isSameMonth(i.paidAt, now))
    .reduce((sum, i) => sum + i.amount, 0)
  const lastMonthRevenue = primaryInvoices
    .filter((i) => i.status === 'PAID' && i.paidAt && isSameMonth(i.paidAt, lastMonthDate))
    .reduce((sum, i) => sum + i.amount, 0)
  const momChange =
    lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : thisMonthRevenue > 0
        ? 100
        : null

  const monthlyBuckets = getMonthlyBuckets(primaryInvoices, now)

  const statusCounts = {
    all: invoices.length,
    paid: invoices.filter((i) => i.status === 'PAID').length,
    unpaid: unpaidNotOverdueAll.length,
    overdue: overdueAll.length,
    cancelled: invoices.filter((i) => i.status === 'CANCELLED').length,
  }

  let filteredInvoices = invoices
  if (statusFilter === 'paid') filteredInvoices = filteredInvoices.filter((i) => i.status === 'PAID')
  else if (statusFilter === 'unpaid')
    filteredInvoices = filteredInvoices.filter((i) => i.status === 'UNPAID' && !isOverdue(i, now))
  else if (statusFilter === 'overdue')
    filteredInvoices = filteredInvoices.filter((i) => isOverdue(i, now))
  else if (statusFilter === 'cancelled')
    filteredInvoices = filteredInvoices.filter((i) => i.status === 'CANCELLED')

  if (query) {
    const q = query.toLowerCase()
    filteredInvoices = filteredInvoices.filter(
      (i) =>
        i.number?.toLowerCase().includes(q) ||
        i.project?.name?.toLowerCase().includes(q) ||
        i.project?.client?.name?.toLowerCase().includes(q)
    )
  }

  let subtitle
  if (invoices.length === 0) {
    subtitle = "Create your first invoice once you're ready to bill a client."
  } else if (overdueAll.length > 0) {
    subtitle = `${overdueAll.length} invoice${overdueAll.length > 1 ? 's' : ''} overdue and waiting on clients.`
  } else if (unpaidNotOverdueAll.length > 0) {
    subtitle = `${unpaidNotOverdueAll.length} invoice${unpaidNotOverdueAll.length > 1 ? 's' : ''} awaiting payment.`
  } else {
    subtitle = 'All invoices are settled. Nice work.'
  }

  const nextInvoiceNumber = `INV-${String(invoices.length + 1).padStart(3, '0')}`

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-7 mb-8 border-b border-fp-border">
        <div className="pt-2">
          <h1 className="font-sans text-3xl font-medium text-fp-text-primary">Invoices</h1>
          <p className="text-fp-text-secondary text-sm mt-2">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-3">
          <ExportCsvButton invoices={filteredInvoices} />
          <NewInvoiceModal projects={projects} nextNumber={nextInvoiceNumber} />
        </div>
      </div>

      {/* Revenue panel — the page's hero: a compact ledger, not a stat-card grid */}
      <section className="border border-fp-border rounded-2xl bg-fp-surface/40 px-5 sm:px-7 py-6 mb-8">
        <div className="flex items-center justify-between mb-6 gap-3">
          <h2 className="text-fp-text-secondary text-xs font-semibold uppercase tracking-widest">
            Revenue
          </h2>
          {otherCurrencyNote && (
            <p className="text-fp-text-tertiary text-xs text-right">{otherCurrencyNote}</p>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-6 gap-x-4 sm:gap-0 sm:divide-x sm:divide-fp-border">
          <Metric label="Total Revenue" value={formatCurrency(totalRevenue, dominantCurrency)} />
          <Metric
            label="This Month"
            value={formatCurrency(thisMonthRevenue, dominantCurrency)}
            delta={momChange}
          />
          <Metric label="Outstanding" value={formatCurrency(outstanding, dominantCurrency)} />
          <Metric
            label="Overdue"
            value={formatCurrency(overdueAmount, dominantCurrency)}
            warn={overdueAll.length > 0}
          />
        </div>

        <div className="mt-8 pt-6 border-t border-fp-border">
          <p className="text-fp-text-tertiary text-xs mb-4">Last 6 months</p>
          <RevenueTrend buckets={monthlyBuckets} currency={dominantCurrency} />
        </div>
      </section>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-fp-text-secondary text-xs font-semibold uppercase tracking-widest">
          All Invoices
        </h2>
      </div>
      <div className="mb-4">
        <InvoiceFilters activeStatus={statusFilter} activeQuery={query} counts={statusCounts} />
      </div>

      {/* Table */}
      {invoices.length === 0 ? (
        <EmptyState />
      ) : filteredInvoices.length === 0 ? (
        <NoResultsState />
      ) : (
        <div className="border border-fp-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-fp-border bg-fp-surface/60">
                  <th className="text-left font-semibold text-fp-text-secondary text-xs uppercase tracking-widest px-5 py-3">
                    Invoice
                  </th>
                  <th className="text-left font-semibold text-fp-text-secondary text-xs uppercase tracking-widest px-5 py-3">
                    Client
                  </th>
                  <th className="text-right font-semibold text-fp-text-secondary text-xs uppercase tracking-widest px-5 py-3">
                    Amount
                  </th>
                  <th className="text-left font-semibold text-fp-text-secondary text-xs uppercase tracking-widest px-5 py-3">
                    Status
                  </th>
                  <th className="text-left font-semibold text-fp-text-secondary text-xs uppercase tracking-widest px-5 py-3">
                    Due
                  </th>
                  <th className="text-right font-semibold text-fp-text-secondary text-xs uppercase tracking-widest px-5 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fp-border">
                {filteredInvoices.map((inv) => {
                  const overdue = isOverdue(inv, now)
                  return (
                    <tr key={inv.id} className="hover:bg-fp-surface/50 transition-colors">
                      <td className="px-5 py-4 align-top">
                        <p className="font-mono text-fp-text-primary text-sm">{inv.number}</p>
                        {inv.milestone && (
                          <p className="text-fp-text-tertiary text-xs mt-0.5">{inv.milestone.title}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 align-top">
                        <p className="text-fp-text-primary text-sm">
                          {inv.project?.client?.name ?? '—'}
                        </p>
                        <p className="text-fp-text-tertiary text-xs mt-0.5">{inv.project?.name}</p>
                      </td>
                      <td className="px-5 py-4 align-top text-right font-mono tabular-nums text-fp-text-primary">
                        {formatCurrency(inv.amount, inv.currency)}
                      </td>
                      <td className="px-5 py-4 align-top">
                        <StatusIndicator invoice={inv} overdue={overdue} />
                      </td>
                      <td className="px-5 py-4 align-top text-sm">
                        {inv.dueDate ? (
                          <span className={overdue ? 'text-fp-warning font-medium' : 'text-fp-text-secondary'}>
                            {formatDate(inv.dueDate)}
                          </span>
                        ) : (
                          <span className="text-fp-text-tertiary">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 align-top text-right">
                        <CopyLinkButton url={inv.stripePaymentLinkUrl} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}