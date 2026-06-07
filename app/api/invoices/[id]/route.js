// app/api/invoices/[id]/route.js

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import prisma from '@/lib/prisma'
import Stripe from 'stripe'

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
    const body   = await request.json()
    const { status } = body

    // Atomic ownership check
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        project: { userId: session.user.id },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
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
      data:  { status },
    })

    return NextResponse.json(updated)

  } catch (error) {
    console.error('[PATCH /api/invoices/[id]]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}