// app/api/invoices/route.js

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import prisma from '@/lib/prisma'
import Stripe from 'stripe'
import { requireProjectMembership } from '@/lib/project'
import { can } from '@/lib/project-permissions'
import { ForbiddenError, NotFoundError } from '@/lib/errors'
import { handleApiError } from '@/lib/http-errors'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
})

export async function POST(request) {
  let invoice = null

  try {
    // Step 1: Auth
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Step 2: Parse and validate body
    const body = await request.json()
    const { projectId, amount, currency = 'USD', dueDate, note, milestoneId } = body

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'amount must be a positive number' },
        { status: 400 }
      )
    }

    // CHANGED: was `prisma.project.findFirst({ where: { id: projectId,
    // userId: session.user.id } })` — the SAME bug the very first fix
    // in this whole project addressed on the project-delete route:
    // matching against `userId` only recognizes the project's
    // ORIGINAL CREATOR. A Workspace Owner/Admin who didn't personally
    // create this project, or a PM staffed on it later, would have
    // been silently blocked here — not a permissions decision, just a
    // stale check that predates workspaces and project staffing
    // entirely.
    //
    // requireProjectMembership throws NotFoundError if the project
    // doesn't exist, ForbiddenError if this user isn't staffed on it
    // and isn't an implicit Owner/Admin. can(role, 'createInvoices')
    // is then the actual matrix decision: true for Owner/Admin, false
    // for PM (view only) and Contributor (no access at all).
    const membership = await requireProjectMembership(session.user.id, projectId)
    if (!can(membership.role, 'createInvoices')) {
      throw new ForbiddenError('You do not have permission to create invoices on this project.')
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: { select: { name: true } },
      },
    })

    if (!project) {
      throw new NotFoundError('Project not found.')
    }

    // Step 4: Validate milestoneId ownership (if provided)
    if (milestoneId) {
      const milestone = await prisma.milestone.findFirst({
        where: {
          id:        milestoneId,
          projectId: projectId,    // must belong to the same project
        },
      })

      if (!milestone) {
        return NextResponse.json(
          { error: 'Milestone not found or does not belong to this project' },
          { status: 400 }
        )
      }
    }

    // Step 5: Reserve invoice number + create DB row atomically
    //
    // WHY a transaction here:
    // Without it, two simultaneous requests could both read existingCount = 2
    // and both try to create INV-003. The $transaction locks the rows so only
    // one request can count + create at a time.
    //
    // WHY we create the invoice BEFORE calling Stripe:
    // Stripe calls go OUTSIDE the transaction (they can take 1–3 seconds and
    // a DB transaction has a 5-second timeout). So we create the invoice first
    // to lock in the number, then fill in the Stripe IDs after.
    //
    // WHY we use tx.invoice (not prisma.invoice) inside the callback:
    // `tx` is the transaction-aware client. Using `prisma` inside a transaction
    // bypasses the lock entirely — defeating the whole point.
    invoice = await prisma.$transaction(async (tx) => {
      const existingCount = await tx.invoice.count({
        where: { projectId },
      })

      // INV-001, INV-002, etc. — padStart ensures always 3 digits.
      // Per-project (not global) so each client sees a clean sequence.
      const number = `INV-${String(existingCount + 1).padStart(3, '0')}`

      return tx.invoice.create({
        data: {
          number,
          amount:      Number(amount),
          currency:    currency.toUpperCase(),
          status:      'UNPAID',
          dueDate:     dueDate      ? new Date(dueDate) : null,
          note:        note?.trim() || null,
          milestoneId: milestoneId  || null,
          projectId,
          // stripePaymentLinkId and stripePaymentLinkUrl are null for now.
          // They are filled in Step 7 after Stripe responds.
        },
      })
    })

    // ── Step 6: Create Stripe Price ─────────────────────────────────────────
    //
    // A Stripe Price defines "what to charge and in which currency".
    // It must be created before the Payment Link because the link references it.
    //
    // Stripe works in the smallest currency unit:
    // $2,500.00 → 250000 cents. Math.round handles floating-point imprecision.
    const amountInCents = Math.round(Number(amount) * 100)

    const price = await stripe.prices.create({
      currency:     currency.toLowerCase(),
      unit_amount:  amountInCents,
      product_data: {
        // This is what the client sees on the Stripe-hosted payment page.
        name: `${invoice.number} — ${project.name}`,
        metadata: {
          project: project.name,
          client:  project.client?.name ?? 'Client',
          invoice: invoice.number,
        },
      },
    })

    // ── Step 7: Create Stripe Payment Link ──────────────────────────────────
    //
    // A Payment Link is a permanent, shareable URL the client clicks to pay.
    // Stripe hosts the entire payment flow — no frontend checkout code needed.
    //
    // We store { projectId, invoiceNumber } in metadata so the webhook handler
    // (app/api/webhooks/stripe/route.js) can find and update the right invoice
    // when Stripe notifies us that payment succeeded.
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price:    price.id,
          quantity: 1,
        },
      ],
      // after_completion: show a hosted confirmation page instead of redirecting.
      // The client sees a branded thank-you message — no extra page needed on our side.
      after_completion: {
        type: 'hosted_confirmation',
        hosted_confirmation: {
          custom_message: `Thank you for your payment. ${project.name} is all taken care of.`,
        },
      },
      metadata: {
        projectId,
        invoiceNumber: invoice.number,
      },
    })

    // ── Step 8: Attach Stripe IDs to the invoice ────────────────────────────
    //
    // Now that Stripe has responded successfully, update the DB row with the
    // payment link ID and URL. The client portal reads stripePaymentLinkUrl
    // to show the "Pay Now" button.
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        stripePaymentLinkId:  paymentLink.id,
        stripePaymentLinkUrl: paymentLink.url,
      },
    })

    return NextResponse.json(updatedInvoice, { status: 201 })

  } catch (error) {
    // ── Cleanup: delete the DB invoice if Stripe failed ─────────────────────
    //
    // If the $transaction succeeded (invoice was created) but a Stripe call
    // threw, we have an orphaned invoice with no payment link. Delete it so
    // the freelancer can retry cleanly without gaps in the invoice number sequence.
    if (invoice?.id && error.type?.startsWith('Stripe')) {
      await prisma.invoice.delete({ where: { id: invoice.id } }).catch((cleanupErr) => {
        // Log but don't throw — we still need to return the Stripe error below.
        console.error('[POST /api/invoices] Cleanup failed for invoice:', invoice.id, cleanupErr)
      })
    }

    // Stripe errors have a .type field starting with 'Stripe' — surface them clearly.
    if (error.type?.startsWith('Stripe')) {
      console.error('[POST /api/invoices] Stripe error:', error.message)
      return NextResponse.json(
        { error: `Stripe error: ${error.message}` },
        { status: 502 }
      )
    }

    // CHANGED — was a bare console.error + generic 500 for everything.
    // Now routes NotFoundError/ForbiddenError (from requireProjectMembership
    // and the can() check above) through handleApiError, same as every
    // other route in the app, instead of flattening them into an opaque
    // 500 that would have hidden the real reason from the client.
    if (error.name === 'NotFoundError' || error.name === 'ForbiddenError') {
      return handleApiError(error)
    }

    console.error('[POST /api/invoices]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}