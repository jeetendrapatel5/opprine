// lib/billing/webhook-handler.js
//
// Razorpay webhook processing, independent of the Next.js request object.
// Order: authenticate, deduplicate, sync from Razorpay, record the event.
// The sync and the event insert share one transaction, so a failed sync
// leaves no event row and Razorpay's retry is processed from scratch.

import { verifyWebhookSignature, hashWebhookBody } from './webhook-signature.js'
import { syncSubscriptionState } from './subscription-sync.js'

const TRANSACTION_OPTIONS = { maxWait: 5000, timeout: 20000 }

function reply(status, body) {
  return { status, body }
}

function describeError(err) {
  return err?.error?.description ?? err?.message ?? String(err)
}

export async function handleRazorpayWebhook({ rawBody, signature, eventId, secret, prisma, razorpay }) {
  if (!signature || !eventId) {
    return reply(400, { error: 'Missing required webhook headers' })
  }

  let signatureValid
  try {
    signatureValid = verifyWebhookSignature(rawBody, signature, secret)
  } catch (err) {
    console.error('Razorpay webhook rejected:', err.message)
    return reply(500, { error: 'Webhook not configured' })
  }
  if (!signatureValid) {
    return reply(400, { error: 'Invalid signature' })
  }

  let event
  try {
    event = JSON.parse(rawBody)
  } catch {
    return reply(400, { error: 'Invalid payload' })
  }
  if (typeof event?.event !== 'string') {
    return reply(400, { error: 'Invalid payload' })
  }

  const bodyHash = hashWebhookBody(rawBody)
  const seen = await prisma.webhookEvent.findFirst({
    where: { OR: [{ razorpayEventId: eventId }, { bodyHash }] },
    select: { id: true },
  })
  if (seen) return reply(200, { status: 'duplicate' })

  const subscriptionId = event.payload?.subscription?.entity?.id

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const result = subscriptionId
        ? await syncSubscriptionState(tx, razorpay, subscriptionId)
        : 'IGNORED'

      await tx.webhookEvent.create({
        data: {
          razorpayEventId: eventId,
          bodyHash,
          eventType: event.event,
          status: result,
          payload: event,
        },
      })
      return result
    }, TRANSACTION_OPTIONS)

    if (outcome === 'UNMATCHED') {
      console.error('Razorpay webhook for unknown subscription:', {
        eventId,
        eventType: event.event,
        subscriptionId,
      })
    }
    return reply(200, { status: outcome.toLowerCase() })
  } catch (err) {
    if (err?.code === 'P2002') return reply(200, { status: 'duplicate' })

    console.error('Razorpay webhook processing failed:', {
      eventId,
      eventType: event.event,
      subscriptionId,
      message: describeError(err),
    })
    return reply(500, { error: 'Internal error' })
  }
}
