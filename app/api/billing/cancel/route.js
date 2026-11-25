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
import { cancelSubscription } from '@/lib/billing/cancel'

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

    const result = await cancelSubscription({
      prisma,
      razorpay,
      subscription,
      immediately: wantsImmediate,
    })
    return Response.json(result.body, { status: result.status })
  } catch (error) {
    return handleApiError(error)
  }
}