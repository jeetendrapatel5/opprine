// lib/billing/payment-ledger.js
//
// Keeps the Payment table in step with Razorpay. Payment state is read
// from the Razorpay API (or taken from a payment entity the API itself
// returned in a list), never from a webhook body. Dispute state is the
// exception: it comes from the signed event and is ordered by event time.

import { withTimeout, FETCH_TIMEOUT_MS } from './subscription-sync.js'

export function extractPaymentRef(event) {
  const payload = event?.payload ?? {}
  const type = typeof event?.event === 'string' ? event.event : ''
  const paymentId =
    payload.payment?.entity?.id ?? payload.refund?.entity?.payment_id ?? payload.dispute?.entity?.payment_id ?? null
  if (!paymentId) return null

  return {
    paymentId,
    subscriptionId: payload.subscription?.entity?.id ?? null,
    dispute: type.startsWith('payment.dispute.') ? (payload.dispute?.entity ?? null) : null,
    eventAt: typeof event.created_at === 'number' ? new Date(event.created_at * 1000) : null,
  }
}

export function mapPaymentStatus(remote) {
  const refunded = remote.amount_refunded ?? 0
  switch (remote.status) {
    case 'created':
      return 'CREATED'
    case 'authorized':
      return 'AUTHORIZED'
    case 'failed':
      return 'FAILED'
    case 'refunded':
      return 'REFUNDED'
    case 'captured':
      if (refunded <= 0) return 'CAPTURED'
      return refunded >= remote.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED'
    default:
      throw new Error(`Unknown Razorpay payment status: ${remote.status}`)
  }
}

async function resolveOwner(tx, razorpay, { hint, existing, invoiceId, timeoutMs }) {
  let subscriptionId = hint ?? existing?.razorpaySubscriptionId ?? null
  if (!subscriptionId && invoiceId) {
    const invoice = await withTimeout(razorpay.invoices.fetch(invoiceId), timeoutMs)
    subscriptionId = invoice?.subscription_id ?? null
  }
  if (!subscriptionId) return { subscriptionId: null, workspaceId: existing?.workspaceId ?? null }

  const subscription = await tx.subscription.findUnique({
    where: { razorpaySubscriptionId: subscriptionId },
    select: { workspaceId: true },
  })
  const attempt = subscription
    ? null
    : await tx.checkoutAttempt.findUnique({
        where: { razorpaySubscriptionId: subscriptionId },
        select: { workspaceId: true },
      })
  return {
    subscriptionId,
    workspaceId: subscription?.workspaceId ?? attempt?.workspaceId ?? existing?.workspaceId ?? null,
  }
}

// Must run inside a transaction. `remote` may be supplied when the
// caller already holds a payment entity returned by the Razorpay API.
// Returns the alerts the caller should send once the transaction commits.
export async function syncPayment(tx, razorpay, ref, { remote = null, timeoutMs = FETCH_TIMEOUT_MS } = {}) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'payment:' + ref.paymentId}))`

  const payment = remote ?? (await withTimeout(razorpay.payments.fetch(ref.paymentId), timeoutMs))
  if (payment?.id !== ref.paymentId) {
    throw new Error(`Razorpay returned payment ${payment?.id} for ${ref.paymentId}`)
  }

  const existing = await tx.payment.findUnique({ where: { razorpayPaymentId: ref.paymentId } })
  const owner = await resolveOwner(tx, razorpay, {
    hint: ref.subscriptionId,
    existing,
    invoiceId: payment.invoice_id,
    timeoutMs,
  })

  const data = {
    workspaceId: owner.workspaceId,
    razorpaySubscriptionId: owner.subscriptionId,
    razorpayInvoiceId: payment.invoice_id ?? null,
    amount: payment.amount,
    currency: payment.currency,
    status: mapPaymentStatus(payment),
    amountRefunded: payment.amount_refunded ?? 0,
    method: payment.method ?? null,
    failureCode: payment.error_code ?? null,
    failureReason: payment.error_description ?? null,
    paidAt: new Date(payment.created_at * 1000),
  }

  const alerts = []
  if (ref.dispute && ref.eventAt && (!existing?.disputeEventAt || ref.eventAt >= existing.disputeEventAt)) {
    data.disputeId = ref.dispute.id
    data.disputeStatus = ref.dispute.status
    data.disputeEventAt = ref.eventAt
    if (existing?.disputeStatus !== ref.dispute.status) {
      alerts.push({ kind: 'DISPUTE', paymentId: ref.paymentId, disputeId: ref.dispute.id, status: ref.dispute.status })
    }
  }
  if (data.amountRefunded > (existing?.amountRefunded ?? 0)) {
    alerts.push({ kind: 'REFUND', paymentId: ref.paymentId, amountRefunded: data.amountRefunded, currency: data.currency })
  }
  if (data.status === 'CAPTURED' && !data.workspaceId) {
    alerts.push({ kind: 'UNATTRIBUTED_PAYMENT', paymentId: ref.paymentId, amount: data.amount, currency: data.currency })
  }

  if (existing) {
    await tx.payment.update({ where: { id: existing.id }, data })
  } else {
    await tx.payment.create({ data: { razorpayPaymentId: ref.paymentId, ...data } })
  }
  return alerts
}
