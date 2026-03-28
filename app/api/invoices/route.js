// app/api/invoices/route.js
//
// POST — create a new invoice for a project.
//
// What this route does in order:
//   1. Authenticate the freelancer
//   2. Validate the request body
//   3. Verify the freelancer owns the project (BOLA prevention)
//   4. Generate an invoice number (INV-001, INV-002, etc.)
//   5. Create a Stripe Price + Payment Link
//   6. Save the invoice to the database with the Stripe URLs
//   7. Return the new invoice

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import Stripe from 'stripe'

// Initialize Stripe with the secret key.
// apiVersion pins the Stripe API version so a Stripe update never
// silently changes behavior in your app.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
})

export async function POST(request) {
  try {
    // ── Step 1: Auth ────────────────────────────────────────────────────────
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Step 2: Parse and validate body ────────────────────────────────────
    const body = await request.json()
    const { projectId, amount, currency = 'USD', dueDate, note, milestoneId } = body

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })
    }

    // ── Step 3: Ownership check ─────────────────────────────────────────────
    // Fetch the project with its client — we need the client name for the
    // Stripe product name so the payment page looks professional.
    const project = await prisma.project.findFirst({
      where: {
        id:     projectId,
        userId: session.user.id,
      },
      include: {
        client: { select: { name: true } },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // ── Step 4: Generate invoice number ────────────────────────────────────
    // Count how many invoices this project already has.
    // First invoice = INV-001, second = INV-002, etc.
    // padStart(3, '0') ensures we always have 3 digits: 1 → "001"
    // WHY per-project and not global: each project is a separate engagement.
    // A client shouldn't see "INV-047" and wonder what the other 46 were.
    const existingCount = await prisma.invoice.count({
      where: { projectId },
    })
    const number = `INV-${String(existingCount + 1).padStart(3, '0')}`

    // ── Step 5: Create Stripe Price + Payment Link ──────────────────────────
    // Stripe works in the smallest currency unit.
    // For USD: $2,500.00 → 250000 cents
    // Math.round handles any floating point issues from the input
    const amountInCents = Math.round(Number(amount) * 100)

    // Step 5a — Create a Stripe Price.
    // A Price defines "how much" and "what currency".
    // product_data.name is what appears on the Stripe-hosted payment page.
    const price = await stripe.prices.create({
      currency:     currency.toLowerCase(),
      unit_amount:  amountInCents,
      product_data: {
        name: `${number} — ${project.name}`,
        // Shown below the product name on the payment page
        metadata: {
          project:  project.name,
          client:   project.client?.name ?? 'Client',
          invoice:  number,
        },
      },
    })

    // Step 5b — Create a Stripe Payment Link using that price.
    // A Payment Link is a permanent, shareable URL.
    // The client clicks it, enters their card, and pays.
    // Stripe handles everything — no webhook needed just to show the page.
    // We DO need a webhook (Feature 7.4) to know when payment succeeds.
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price:    price.id,
          quantity: 1,
        },
      ],
      // after_completion shows a confirmation message instead of redirecting
      after_completion: {
        type:          'hosted_confirmation',
        hosted_confirmation: {
          custom_message: `Thank you for your payment. ${project.name} is all taken care of.`,
        },
      },
      // Store our invoice reference in Stripe metadata.
      // This is how the webhook (Feature 7.4) will find the invoice
      // when Stripe notifies us that payment succeeded.
      metadata: {
        projectId,
        invoiceNumber: number,
      },
    })

    // ── Step 6: Save to database ────────────────────────────────────────────
    const invoice = await prisma.invoice.create({
      data: {
        number,
        amount:              Number(amount),
        currency:            currency.toUpperCase(),
        status:              'UNPAID',
        dueDate:             dueDate    ? new Date(dueDate) : null,
        note:                note?.trim()   || null,
        milestoneId:         milestoneId    || null,
        projectId,
        stripePaymentLinkId:  paymentLink.id,
        stripePaymentLinkUrl: paymentLink.url,
      },
    })

    return NextResponse.json(invoice, { status: 201 })

  } catch (error) {
    // Stripe errors have a `type` field — log it specifically for easier debugging
    if (error.type?.startsWith('Stripe')) {
      console.error('[POST /api/invoices] Stripe error:', error.message)
      return NextResponse.json(
        { error: `Stripe error: ${error.message}` },
        { status: 502 }
      )
    }
    console.error('[POST /api/invoices]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}