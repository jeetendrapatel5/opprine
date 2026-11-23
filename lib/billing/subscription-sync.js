// lib/billing/subscription-sync.js
//
// Local subscription state is derived from Razorpay's current record of
// the subscription, never from a webhook body. Events can arrive late,
// out of order or duplicated; the fetched state is always the latest.

const FETCH_TIMEOUT_MS = 8000

const STATUS_MAP = {
  created: 'PENDING',
  authenticated: 'PENDING',
  active: 'ACTIVE',
  pending: 'PAST_DUE',
  halted: 'EXPIRED',
  paused: 'EXPIRED',
  cancelled: 'CANCELLED',
  completed: 'CANCELLED',
  expired: 'EXPIRED',
}

function toDate(unixSeconds) {
  return unixSeconds ? new Date(unixSeconds * 1000) : null
}

// Paid access requires at least one successful charge. If Razorpay omits
// paid_count, its status is trusted as-is.
function hasSuccessfulCharge(remote) {
  return typeof remote.paid_count === 'number' ? remote.paid_count > 0 : true
}

export function mapRazorpayStatus(remote) {
  const status = STATUS_MAP[remote.status]
  if (!status) throw new Error(`Unknown Razorpay subscription status: ${remote.status}`)
  if (status === 'ACTIVE' && !hasSuccessfulCharge(remote)) return 'PENDING'
  return status
}

export function buildSubscriptionUpdate(remote) {
  const status = mapRazorpayStatus(remote)
  const data = { status }

  // Null period fields never overwrite a known paid-until date.
  const periodStart = toDate(remote.current_start)
  const periodEnd = toDate(remote.current_end)
  if (periodStart) data.currentPeriodStart = periodStart
  if (periodEnd) data.currentPeriodEnd = periodEnd

  if (status === 'ACTIVE' && remote.has_scheduled_changes) data.cancelAtPeriodEnd = true
  if (status === 'CANCELLED' || status === 'EXPIRED') data.cancelAtPeriodEnd = false

  return data
}

function withTimeout(promise, ms) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Razorpay request timed out after ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

// Must run inside a transaction. The per-subscription advisory lock makes
// concurrent syncs run one after another, so a sync that fetched older
// state can never commit after one that fetched newer state.
export async function syncSubscriptionState(tx, razorpay, razorpaySubscriptionId, { timeoutMs = FETCH_TIMEOUT_MS } = {}) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${razorpaySubscriptionId}))`

  const local = await tx.subscription.findUnique({
    where: { razorpaySubscriptionId },
    select: { id: true },
  })
  if (!local) return 'UNMATCHED'

  const remote = await withTimeout(razorpay.subscriptions.fetch(razorpaySubscriptionId), timeoutMs)
  if (remote?.id !== razorpaySubscriptionId) {
    throw new Error(`Razorpay returned subscription ${remote?.id} for ${razorpaySubscriptionId}`)
  }

  await tx.subscription.update({
    where: { id: local.id },
    data: buildSubscriptionUpdate(remote),
  })
  return 'PROCESSED'
}
