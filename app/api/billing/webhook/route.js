// app/api/billing/webhook/route.js
//
// This is the ONLY place in the app allowed to mark a Subscription as
// ACTIVE. Nothing in the checkout flow does that — it only Razorpay,
// via a signed webhook, that we trust as proof a real payment happened.
//
// Flow, in order:
//   1. Read the RAW request body (not parsed JSON) — required, because
//      the signature is computed over the exact raw bytes Razorpay sent.
//   2. Verify X-Razorpay-Signature using HMAC-SHA256 + our webhook
//      secret. If it doesn't match, reject — this stops anyone who
//      isn't Razorpay from faking a "payment succeeded" call.
//   3. Read X-Razorpay-Event-Id (unique per event, confirmed against
//      Razorpay's own docs). Try to insert it into WebhookEvent AND
//      update the Subscription in ONE database transaction.
//        - If razorpayEventId already exists, the unique constraint on
//          WebhookEvent throws, the whole transaction rolls back, and
//          we just tell Razorpay "ok, already handled" — no double
//          processing.
//        - If our own processing logic throws for a real reason, the
//          WebhookEvent insert rolls back too, so Razorpay's retry
//          later will correctly re-attempt full processing (not skip
//          it as "already done").

import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

// Converts a Razorpay unix timestamp (seconds) to a JS Date, or null
// if the value is missing (some fields, like current_end, can be null
// for subscriptions that haven't been charged yet).
function toDate(unixSeconds) {
  return unixSeconds ? new Date(unixSeconds * 1000) : null
}

// Applies one webhook event's effect on our local Subscription row.
// `tx` is the transaction client, not the global `prisma` — keeping
// every write inside the same transaction as the idempotency check.
async function applyEvent(tx, event) {
  const subscriptionEntity = event.payload?.subscription?.entity
  if (!subscriptionEntity) {
    // Not every Razorpay webhook event is about a subscription (e.g.
    // this endpoint could in theory receive other event types if
    // someone selects more events in the dashboard than intended).
    // Nothing to sync — just record that we saw it and stop.
    return
  }

  const razorpaySubscriptionId = subscriptionEntity.id

  const localSubscription = await tx.subscription.findUnique({
    where: { razorpaySubscriptionId },
  })

  if (!localSubscription) {
    // We got an event for a Razorpay subscription we have no local
    // record of. This shouldn't normally happen (we create the local
    // row during checkout, before Razorpay ever sends a webhook for
    // it) — but if it does, we don't want to crash the whole webhook
    // (which would make Razorpay retry forever). Log and move on.
    console.warn(
      `Webhook for unknown razorpaySubscriptionId: ${razorpaySubscriptionId}`
    )
    return
  }

  const periodFields = {
    currentPeriodStart: toDate(subscriptionEntity.current_start),
    currentPeriodEnd: toDate(subscriptionEntity.current_end),
  }

  switch (event.event) {
    case 'subscription.activated':
    case 'subscription.charged':
      // Both mean "a real payment just succeeded" — activated fires on
      // the first payment, charged fires on this one AND every renewal.
      await tx.subscription.update({
        where: { id: localSubscription.id },
        data: { status: 'ACTIVE', ...periodFields },
      })
      break

    case 'subscription.pending':
      // A renewal charge failed but Razorpay is still retrying —
      // grace period, not yet cut off.
      await tx.subscription.update({
        where: { id: localSubscription.id },
        data: { status: 'PAST_DUE' },
      })
      break

    case 'subscription.halted':
      // Retries exhausted, Razorpay has stopped trying to charge.
      // Treat as no-longer-usable — downgrades their entitlements.
      await tx.subscription.update({
        where: { id: localSubscription.id },
        data: { status: 'EXPIRED' },
      })
      break

    case 'subscription.cancelled':
    case 'subscription.completed':
      // cancelled = explicitly stopped early. completed = ran through
      // all total_count cycles naturally. Either way, no more billing.
      await tx.subscription.update({
        where: { id: localSubscription.id },
        data: { status: 'CANCELLED', ...periodFields },
      })
      break

    case 'subscription.paused':
      // APPROXIMATION — flagging this rather than hiding it: Razorpay's
      // "paused" is meant to be temporary/resumable, but our enum has
      // no PAUSED state yet. Treating as EXPIRED (access revoked) is
      // the safe default. If you use pause/resume in practice, tell me
      // and I'll add a real PAUSED status instead of overloading EXPIRED.
      await tx.subscription.update({
        where: { id: localSubscription.id },
        data: { status: 'EXPIRED' },
      })
      break

    case 'subscription.resumed':
      await tx.subscription.update({
        where: { id: localSubscription.id },
        data: { status: 'ACTIVE', ...periodFields },
      })
      break

    case 'subscription.updated':
      // Plan/quantity/schedule changed on Razorpay's side — refresh
      // period dates and the cancel-at-period-end flag.
      await tx.subscription.update({
        where: { id: localSubscription.id },
        data: {
          ...periodFields,
          cancelAtPeriodEnd: Boolean(subscriptionEntity.has_scheduled_changes),
        },
      })
      break

    case 'subscription.authenticated':
      // First mandate step done, but no payment yet — still PENDING,
      // nothing to change.
      break

    default:
      // Unrecognized event type — record it (via WebhookEvent, below)
      // but don't attempt to change Subscription state.
      break
  }
}

export async function POST(request) {
  // 1. Raw body — MUST be the exact bytes, not re-serialized JSON, or
  // signature verification will fail even for genuine Razorpay requests.
  const rawBody = await request.text()

  const signature = request.headers.get('x-razorpay-signature')
  const eventId = request.headers.get('x-razorpay-event-id')

  if (!signature || !eventId) {
    return Response.json({ error: 'Missing required webhook headers' }, { status: 400 })
  }

  // 2. Verify signature: HMAC-SHA256 of the raw body, keyed with our
  // webhook secret, must match what Razorpay sent.
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')

  // timingSafeEqual instead of `===` — prevents a timing attack where
  // an attacker could guess the correct signature one byte at a time by
  // measuring how long the comparison takes.
  const signaturesMatch =
    expectedSignature.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))

  if (!signaturesMatch) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Only parse JSON AFTER verifying the signature on the raw text.
  const event = JSON.parse(rawBody)

  // 3. Idempotent processing: insert the WebhookEvent row and apply the
  // event's effects in ONE transaction. If razorpayEventId already
  // exists, this throws with Prisma error code P2002 and the whole
  // transaction (including any Subscription update) rolls back.
  try {
    await prisma.$transaction(async (tx) => {
      await tx.webhookEvent.create({
        data: {
          razorpayEventId: eventId,
          eventType: event.event,
          payload: event,
        },
      })
      await applyEvent(tx, event)
    })
  } catch (err) {
    if (err.code === 'P2002') {
      // Duplicate delivery of an event we've already fully processed.
      // Still return 2XX — telling Razorpay "we got it" is correct
      // here, NOT an error, or Razorpay will keep retrying forever.
      return Response.json({ status: 'already processed' })
    }
    // A genuine failure while processing — rethrow so this returns a
    // 500. Razorpay will retry with backoff, and since the WebhookEvent
    // insert rolled back too, the retry will be treated as new and
    // fully reprocessed (not skipped as a false duplicate).
    console.error('Webhook processing failed:', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }

  return Response.json({ status: 'ok' })
}