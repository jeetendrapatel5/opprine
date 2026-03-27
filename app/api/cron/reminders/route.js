// app/api/cron/reminders/route.js
//
// Responsibility: find every milestone that has been IN_REVIEW for 3+ days
// and send a reminder email to the client.
//
// This route is meant to be called by an external scheduler — not by users.
// Vercel Cron (vercel.json) or Railway's cron scheduler can hit this URL
// on a schedule like "every day at 9am".
//
// SECURITY:
// This route is public in the sense that it has no NextAuth session.
// We protect it with a shared secret instead — CRON_SECRET in your .env.
// The scheduler sends the secret in an Authorization header.
// If the header is missing or wrong, we return 401 immediately.
// This prevents anyone who stumbles on the URL from triggering mass emails.

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { milestoneReminderEmail } from '@/lib/emailTemplates'

export async function GET(request) {
  try {

    // ── Step 1: Verify the cron secret ──────────────────────────────────────
    // The scheduler must send:
    //   Authorization: Bearer <your_cron_secret>
    //
    // request.headers.get('authorization') returns the full header value
    // e.g. "Bearer abc123xyz"
    // We split on ' ' and take the second part to get just the token.
    const authHeader = request.headers.get('authorization')
    const token      = authHeader?.split(' ')[1]

    if (!token || token !== process.env.CRON_SECRET) {
      console.warn('[Cron] Unauthorized attempt to call /api/cron/reminders')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Step 2: Calculate the cutoff time ───────────────────────────────────
    // We want milestones that have been IN_REVIEW for AT LEAST 3 days.
    // "3 days ago" = current time minus 3 days in milliseconds.
    //
    // Date arithmetic in JavaScript:
    //   new Date()              → right now
    //   3 * 24 * 60 * 60 * 1000 → 3 days in milliseconds
    //   new Date(now - ms)      → a Date object 3 days in the past
    //
    // Prisma's `lt` (less than) operator finds records where updatedAt
    // is EARLIER than the cutoff — meaning they haven't been touched in 3+ days.
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
    const cutoffDate    = new Date(Date.now() - THREE_DAYS_MS)

    // ── Step 3: Find all stale IN_REVIEW milestones ──────────────────────────
    // We fetch everything the email needs in one query.
    // We include the project → client and project → user relations
    // for the same reason as Feature 6.2: avoid extra queries.
    const staleMilestones = await prisma.milestone.findMany({
      where: {
        status:    'IN_REVIEW',
        updatedAt: { lt: cutoffDate },
      },
      include: {
        project: {
          include: {
            client: {
              select: {
                name:       true,
                email:      true,
                magicToken: true,
              },
            },
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    console.log(`[Cron] Found ${staleMilestones.length} stale milestones to remind`)

    // ── Step 4: Send a reminder email for each stale milestone ───────────────
    // We track results so we can return a useful summary to the scheduler.
    // This helps with debugging — you can see in the scheduler's logs
    // exactly how many emails were sent vs failed.
    let sent   = 0
    let failed = 0

    // We use a for...of loop here instead of Promise.all(milestones.map(...))
    //
    // WHY for...of instead of Promise.all:
    // Promise.all fires all emails simultaneously. If you have 50 stale
    // milestones, that's 50 concurrent Resend API calls at once.
    // Most email APIs have rate limits. Sequential sending is slower but
    // much safer — each email finishes before the next one starts.
    // For a cron job running once a day, speed doesn't matter.
    for (const milestone of staleMilestones) {
      const { project } = milestone
      const client      = project?.client

      // Skip if this project has no client or the client has no email.
      // This shouldn't happen in normal usage but we handle it defensively.
      if (!client?.email) {
        console.warn(`[Cron] Milestone ${milestone.id} has no client email, skipping`)
        continue
      }

      // Calculate how many days this milestone has been waiting.
      // We show this in the email body: "waiting for 4 days"
      // Math.floor rounds down — 3.8 days becomes 3, which feels honest.
      const daysSinceSent = Math.floor(
        (Date.now() - new Date(milestone.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      )

      const portalUrl = `${process.env.NEXTAUTH_URL}/portal/${client.magicToken}`

      const { subject, html } = milestoneReminderEmail({
        clientName:     client.name,
        freelancerName: project.user.name,
        projectName:    project.name,
        milestoneTitle: milestone.title,
        daysSinceSent,
        portalUrl,
      })

      // sendEmail returns { success: true } or { success: false, error }
      // It never throws — we handle errors inside sendEmail itself.
      const result = await sendEmail({ to: client.email, subject, html })

      if (result.success) {
        sent++
        console.log(`[Cron] Reminder sent for milestone "${milestone.title}" to ${client.email}`)
      } else {
        failed++
        console.error(`[Cron] Failed to send reminder for milestone "${milestone.title}":`, result.error)
      }
    }

    // ── Step 5: Return a summary ─────────────────────────────────────────────
    // The scheduler receives this JSON response.
    // Most schedulers log the response body — this gives you a clear audit
    // trail of what happened each time the cron ran.
    return NextResponse.json({
      success:  true,
      total:    staleMilestones.length,
      sent,
      failed,
      ranAt:    new Date().toISOString(),
    })

  } catch (error) {
    console.error('[Cron] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}