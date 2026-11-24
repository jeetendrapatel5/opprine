// lib/billing/subscription-sync.js
//
// Local subscription state is derived from Razorpay's current record of
// the subscription, never from a webhook body. Events can arrive late,
// out of order or duplicated; the fetched state is always the latest.

export const FETCH_TIMEOUT_MS = 8000

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

export function buildSubscriptionUpdate(remote, now = new Date()) {
  const status = mapRazorpayStatus(remote)
  const data = { status }

  // Null period fields never overwrite a known paid-until date.
  const periodStart = toDate(remote.current_start)
  const periodEnd = toDate(remote.current_end)
  if (periodStart) data.currentPeriodStart = periodStart
  if (periodEnd) data.currentPeriodEnd = periodEnd

  // Paid access of a cancelled subscription ends when it ended, or at the
  // period end if that is earlier. An immediate cancel therefore carries
  // no remaining access.
  if (status === 'CANCELLED') {
    const endedAt = toDate(remote.ended_at) ?? now
    data.currentPeriodEnd = periodEnd && periodEnd < endedAt ? periodEnd : endedAt
  }

  if (remote.customer_id) data.razorpayCustomerId = remote.customer_id

  if (status === 'ACTIVE' && remote.has_scheduled_changes) data.cancelAtPeriodEnd = true
  if (status === 'CANCELLED' || status === 'EXPIRED') data.cancelAtPeriodEnd = false

  return data
}

export function withTimeout(promise, ms) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Razorpay request timed out after ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

async function fetchRemote(razorpay, razorpaySubscriptionId, timeoutMs) {
  const remote = await withTimeout(razorpay.subscriptions.fetch(razorpaySubscriptionId), timeoutMs)
  if (remote?.id !== razorpaySubscriptionId) {
    throw new Error(`Razorpay returned subscription ${remote?.id} for ${razorpaySubscriptionId}`)
  }
  return remote
}

const LIVE_STATUSES = ['ACTIVE', 'PAST_DUE']

// A checkout attempt becomes the workspace's subscription only once
// Razorpay reports a successful charge. Until then the existing row, and
// the access it grants, are left untouched.
async function syncCheckoutAttempt(tx, razorpay, attempt, timeoutMs) {
  if (attempt.status === 'COMPLETED' || attempt.status === 'CONFLICT') return 'IGNORED'

  const remote = await fetchRemote(razorpay, attempt.razorpaySubscriptionId, timeoutMs)
  const update = buildSubscriptionUpdate(remote)

  if (update.status === 'CANCELLED' || update.status === 'EXPIRED') {
    await tx.checkoutAttempt.update({ where: { id: attempt.id }, data: { status: 'ABANDONED' } })
    return 'PROCESSED'
  }
  if (update.status !== 'ACTIVE') return 'PROCESSED'

  // Lock order is attempt id, workspace, then the displaced subscription.
  // Checkout takes the workspace lock alone, and plain syncs take a single
  // subscription lock, so no cycle exists.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'workspace:' + attempt.workspaceId}))`
  const current = await tx.subscription.findUnique({ where: { workspaceId: attempt.workspaceId } })

  if (current?.razorpaySubscriptionId) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${current.razorpaySubscriptionId}))`
  }

  if (current && LIVE_STATUSES.includes(current.status)) {
    // Paid while another subscription is live: stop further charges and
    // leave the existing subscription as it is.
    await razorpay.subscriptions.cancel(attempt.razorpaySubscriptionId, false)
    await tx.checkoutAttempt.update({ where: { id: attempt.id }, data: { status: 'CONFLICT' } })
    console.error('Razorpay subscription paid while the workspace already has a live subscription; manual refund required:', {
      workspaceId: attempt.workspaceId,
      attemptSubscriptionId: attempt.razorpaySubscriptionId,
      liveSubscriptionId: current.razorpaySubscriptionId,
    })
    return 'PROCESSED'
  }

  const data = {
    ...update,
    plan: attempt.plan,
    billingCycle: attempt.billingCycle,
    razorpayPlanId: attempt.razorpayPlanId,
    razorpaySubscriptionId: attempt.razorpaySubscriptionId,
    cancelAtPeriodEnd: update.cancelAtPeriodEnd ?? false,
  }
  if (current) {
    await tx.subscription.update({ where: { id: current.id }, data })
  } else {
    await tx.subscription.create({ data: { workspaceId: attempt.workspaceId, ...data } })
  }
  await tx.checkoutAttempt.update({
    where: { id: attempt.id },
    data: { status: 'COMPLETED', replacedSubscriptionId: current?.razorpaySubscriptionId ?? null },
  })
  return 'PROCESSED'
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

  if (!local) {
    const attempt = await tx.checkoutAttempt.findUnique({ where: { razorpaySubscriptionId } })
    if (attempt) return syncCheckoutAttempt(tx, razorpay, attempt, timeoutMs)

    // Events for a subscription that a later checkout replaced.
    const replaced = await tx.checkoutAttempt.findFirst({
      where: { replacedSubscriptionId: razorpaySubscriptionId },
      select: { id: true },
    })
    return replaced ? 'IGNORED' : 'UNMATCHED'
  }

  const remote = await fetchRemote(razorpay, razorpaySubscriptionId, timeoutMs)
  await tx.subscription.update({
    where: { id: local.id },
    data: buildSubscriptionUpdate(remote),
  })
  return 'PROCESSED'
}
