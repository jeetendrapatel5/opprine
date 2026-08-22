// app/api/billing/cancel/route.js
//
// POST { immediately?: boolean }  — defaults to false.
//
// Two ways to cancel, matching how Razorpay itself models it:
//   - immediately: false (default) — the workspace keeps access until
//     the end of the period they already paid for, then it lapses.
//     This is the friendlier default — nobody wants to lose access to
//     something they already paid for this month.
//   - immediately: true — cuts access off right now.
//
// One edge case handled explicitly: if the subscription is still
// PENDING (checkout started, but the first payment was never
// confirmed), there is no "current billing period" to defer to —
// Razorpay's API actually rejects cancel_at_cycle_end in that state.
// We detect it and force an immediate cancel instead, rather than
// letting that surface as a confusing Razorpay error.

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { razorpay } from '@/lib/billing/razorpay'
import { requireWorkspaceMembership, requireRole } from '@/lib/workspace'
import { NotFoundError } from '@/lib/errors'
import { handleApiError } from '@/lib/http-errors'

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Billing actions are owner-only — same rule as checkout.
    const membership = await requireWorkspaceMembership(session.user.id)
    requireRole(membership.role, ['OWNER'])

    const body = await request.json().catch(() => ({}))
    const wantsImmediate = body?.immediately === true

    const subscription = await prisma.subscription.findUnique({
      where: { workspaceId: membership.workspaceId },
    })

    if (!subscription || !subscription.razorpaySubscriptionId) {
      // Nothing to cancel — either they're on FREE, or ENTERPRISE
      // (manual, no Razorpay object to cancel via this endpoint).
      throw new NotFoundError('No cancellable subscription found for this workspace.')
    }

    if (['CANCELLED', 'EXPIRED'].includes(subscription.status)) {
      return Response.json(
        { error: 'This subscription is already cancelled.' },
        { status: 400 }
      )
    }

    // PENDING = never had a confirmed first payment. Razorpay has no
    // "current cycle" to defer to in this state, so cancel_at_cycle_end
    // isn't valid here — force immediate regardless of what was asked.
    const isPending = subscription.status === 'PENDING'
    const cancelAtCycleEnd = isPending ? false : !wantsImmediate

    await razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId, {
      cancel_at_cycle_end: cancelAtCycleEnd,
    })

    if (cancelAtCycleEnd) {
      // Access continues until currentPeriodEnd. Status stays ACTIVE —
      // the webhook's `subscription.cancelled` event (already handled
      // in webhook/route.js) is what actually flips status to
      // CANCELLED, once the period genuinely ends. We only record the
      // intent here.
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { cancelAtPeriodEnd: true },
      })
    } else {
      // Immediate cancellation — we made the API call ourselves with
      // authenticated server credentials, so (unlike checkout, where a
      // client could lie about payment) this response is trustworthy
      // enough to reflect right away, without waiting on the webhook.
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'CANCELLED', cancelAtPeriodEnd: false },
      })
    }

    return Response.json({
      status: 'ok',
      cancelledImmediately: !cancelAtCycleEnd,
      accessUntil: cancelAtCycleEnd ? subscription.currentPeriodEnd : null,
    })
  } catch (error) {
    return handleApiError(error)
  }
}