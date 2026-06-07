// app/api/webhooks/stripe/route.js
//
// Responsibility: receive Stripe webhook events and update our database.
//
// The only event we handle right now: checkout.session.completed
// This fires when a client successfully pays an invoice via a Payment Link.
//
// CRITICAL SECURITY NOTE:
// This route is completely public — Stripe calls it from their servers.
// We NEVER trust the raw request body. We always verify the signature first.
// If signature verification fails, we return 400 immediately and do nothing.
//
// ALSO CRITICAL — raw body requirement:
// Stripe's signature verification requires the RAW request body as a Buffer,
// not the parsed JSON. Next.js normally parses the body automatically.
// We must read the raw bytes using request.arrayBuffer() BEFORE any parsing.

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
})

export async function POST(request) {
  let event

  try {
    // ── Step 1: Read the raw body ─────────────────────────────────────────
    // arrayBuffer() gives us the raw bytes before any parsing happens.
    // We convert to a Buffer because that's what stripe.webhooks.constructEvent expects.
    const rawBody = await request.arrayBuffer()
    const body    = Buffer.from(rawBody)

    // ── Step 2: Get the Stripe signature header ───────────────────────────
    // Stripe attaches this to every webhook request.
    // It's a hash of the payload signed with your STRIPE_WEBHOOK_SECRET.
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('[Webhook] Missing stripe-signature header')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // ── Step 3: Verify the signature ─────────────────────────────────────
    // constructEvent does two things:
    //   1. Verifies the signature matches the payload + your secret
    //   2. Parses the JSON body into an event object
    //
    // If verification fails, it throws a SignatureVerificationError.
    // We catch it separately so we can return 400 specifically for bad signatures.
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (signatureError) {
      console.error('[Webhook] Signature verification failed:', signatureError.message)
      return NextResponse.json(
        { error: `Signature verification failed: ${signatureError.message}` },
        { status: 400 }
      )
    }

    // ── Step 4: Handle the event ──────────────────────────────────────────
    // We use a switch so adding new event types later is straightforward.
    switch (event.type) {

      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event.data.object)
        break
      }

      // We explicitly ignore events we don't handle.
      // Returning 200 for unhandled events tells Stripe "received, nothing to do".
      // If we returned a non-200, Stripe would retry the webhook repeatedly.
      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`)
    }

    // Always return 200 to Stripe after processing.
    // If we don't, Stripe will retry the webhook up to 3 days.
    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('[Webhook] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// ── Handler: checkout.session.completed ──────────────────────────────────────
//
// This fires when a client finishes paying on a Stripe Payment Link page.
//
// The session object contains metadata we stored when creating the Payment Link.
// We stored { projectId, invoiceNumber } in the metadata — we use this to find
// the invoice in our database.
//
// WHY we look up by stripePaymentLinkId and not just invoiceNumber:
// The Payment Link ID is the most reliable identifier. invoiceNumber is
// per-project (INV-001 exists on every project), so it's not globally unique.
// stripePaymentLinkId is always unique.

async function handleCheckoutCompleted(session) {
  console.log('[Webhook] checkout.session.completed:', session.id)

  // The payment_link field on the session is the ID of the Payment Link used.
  // This is how we trace back to our invoice.
  const paymentLinkId = session.payment_link

  if (!paymentLinkId) {
    // This session wasn't created from a Payment Link (e.g. a direct charge).
    // Nothing for us to do.
    console.log('[Webhook] Session has no payment_link, skipping')
    return
  }

  // ── Find the invoice ────────────────────────────────────────────────────
  // We look up by stripePaymentLinkId which we stored when creating the invoice.
  // We include everything the confirmation emails need.
  const invoice = await prisma.invoice.findFirst({
    where: { stripePaymentLinkId: paymentLinkId },
    include: {
      project: {
        include: {
          user:   { select: { name: true, email: true } },
          client: { select: { name: true, email: true } },
        },
      },
    },
  })

  if (!invoice) {
    // Could happen if the Payment Link was created outside of Freeport,
    // or if the invoice was deleted. Log and move on.
    console.warn('[Webhook] No invoice found for payment_link:', paymentLinkId)
    return
  }

  // ── Guard: don't process the same payment twice ─────────────────────────
  // Stripe can occasionally send the same webhook event more than once.
  // This is called webhook idempotency.
  // If paidAt is already set, we've already processed this payment. Skip.
  if (invoice.paidAt) {
    console.log('[Webhook] Invoice already marked paid, skipping:', invoice.id)
    return
  }

  // ── Mark invoice as PAID ────────────────────────────────────────────────
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: 'PAID',
      paidAt: new Date(),
    },
  })

  console.log(`[Webhook] Invoice ${invoice.number} marked as PAID`)

  // ── Send confirmation emails ────────────────────────────────────────────
  // We send two emails:
  //   1. To the freelancer — "You got paid"
  //   2. To the client    — "Payment received, here's your confirmation"
  //
  // Both are fire-and-forget. Payment is already recorded in the database.
  // An email failure must never affect the payment confirmation.

  const { project }    = invoice
  const freelancer     = project.user
  const client         = project.client
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style:    'currency',
    currency: invoice.currency ?? 'USD',
  }).format(invoice.amount)

  // Email to freelancer
  if (freelancer?.email) {
    const subject = `💰 Payment received — ${invoice.number}`
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; background: #f9fafb; padding: 40px 16px; margin: 0;">
        <div style="background: white; border-radius: 16px; padding: 40px; max-width: 520px; margin: 0 auto; border: 1px solid #e5e7eb;">
          <div style="width: 40px; height: 4px; background: #F59E0B; border-radius: 2px; margin-bottom: 24px;"></div>
          <h1 style="font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 12px 0;">
            Payment received 💰
          </h1>
          <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
            ${client?.name ?? 'Your client'} has paid <strong>${invoice.number}</strong>
            for <strong>${project.name}</strong>.
          </p>
          <p style="font-size: 32px; font-weight: 700; color: #111827; margin: 0 0 24px 0;">
            ${formattedAmount}
          </p>
          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">
            This email was sent by Freeport · Your freelance client portal
          </p>
        </div>
      </body>
      </html>
    `
    sendEmail({ to: freelancer.email, subject, html }).catch((err) => {
      console.error('[Webhook] Failed to send freelancer payment email:', err)
    })
  }

  // Email to client
  if (client?.email) {
    const subject = `Payment confirmed — ${invoice.number}`
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; background: #f9fafb; padding: 40px 16px; margin: 0;">
        <div style="background: white; border-radius: 16px; padding: 40px; max-width: 520px; margin: 0 auto; border: 1px solid #e5e7eb;">
          <div style="width: 40px; height: 4px; background: #10b981; border-radius: 2px; margin-bottom: 24px;"></div>
          <h1 style="font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 12px 0;">
            Payment confirmed ✓
          </h1>
          <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
            Thank you${client?.name ? `, ${client.name}` : ''}. Your payment for
            <strong>${project.name}</strong> has been received.
          </p>
          <p style="font-size: 32px; font-weight: 700; color: #111827; margin: 0 0 8px 0;">
            ${formattedAmount}
          </p>
          <p style="font-size: 13px; color: #6b7280; margin: 0 0 24px 0;">
            Invoice ${invoice.number} · Paid ${new Date().toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric'
            })}
          </p>
          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">
            This email was sent by Freeport · Your freelance client portal
          </p>
        </div>
      </body>
      </html>
    `
    sendEmail({ to: client.email, subject, html }).catch((err) => {
      console.error('[Webhook] Failed to send client payment confirmation email:', err)
    })
  }
}