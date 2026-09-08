// app/api/invoices/[id]/route.js

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import prisma from '@/lib/prisma'
import Stripe from 'stripe'
import { requireProjectMembership } from '@/lib/project'
import { can } from '@/lib/project-permissions'
import { ForbiddenError } from '@/lib/errors'
import { handleApiError } from '@/lib/http-errors'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
})

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const ALLOWED_STATUSES = ['UNPAID', 'PAID', 'CANCELLED']
    const { status } = body

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // CHANGED: was `prisma.invoice.findFirst({ where: { id, project:
    // { userId: session.user.id } } })` — same creator-only bug as
    // POST /api/invoices. Fetch first (need projectId before a
    // project-scoped role check can run — same "fetch, then
    // authorize" order as the milestone routes), then check
    // membership + the matrix.
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: { id: true, projectId: true, stripePaymentLinkId: true },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // can(role, 'editInvoices') is true for Owner/Admin only — PM has
    // viewInvoices but NOT editInvoices (view only, per the matrix),
    // so a PM hitting this route now gets a clear 403 instead of
    // either silently succeeding (the old bug, if they happened to be
    // the creator) or silently failing for the wrong reason.
    const membership = await requireProjectMembership(session.user.id, invoice.projectId)
    if (!can(membership.role, 'editInvoices')) {
      throw new ForbiddenError('You do not have permission to update invoices on this project.')
    }

    // If cancelling, also deactivate the Stripe Payment Link so the client
    // can no longer pay a cancelled invoice.
    if (status === 'CANCELLED' && invoice.stripePaymentLinkId) {
      try {
        await stripe.paymentLinks.update(invoice.stripePaymentLinkId, {
          active: false,
        })
      } catch (stripeError) {
        // Log but don't block — the invoice should still be cancelled
        // even if Stripe deactivation fails (e.g. link already deactivated)
        console.error('[PATCH invoice] Stripe deactivation failed:', stripeError.message)
      }
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json(updated)

  } catch (error) {
    if (error.name === 'NotFoundError' || error.name === 'ForbiddenError') {
      return handleApiError(error)
    }
    console.error('[PATCH /api/invoices/[id]]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}