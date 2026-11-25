// app/api/billing/webhook/route.js
//
// Razorpay webhook endpoint. Subscription state is only ever changed from
// Razorpay's own record of the subscription, fetched server-side after a
// verified webhook; see lib/billing/webhook-handler.js.

import prisma from '@/lib/prisma'
import { razorpay } from '@/lib/billing/razorpay'
import { handleRazorpayWebhook } from '@/lib/billing/webhook-handler'

export async function POST(request) {
  // The signature covers the exact bytes Razorpay sent, so read raw text.
  const rawBody = await request.text()

  const { status, body } = await handleRazorpayWebhook({
    rawBody,
    signature: request.headers.get('x-razorpay-signature'),
    eventId: request.headers.get('x-razorpay-event-id'),
    secret: process.env.RAZORPAY_WEBHOOK_SECRET,
    prisma,
    razorpay,
  })

  return Response.json(body, { status })
}