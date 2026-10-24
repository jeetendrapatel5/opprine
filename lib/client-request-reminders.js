// lib/client-request-reminders.js
//
// Sends the client a reminder email for requests that are still OPEN.
// Called once per cron run by app/api/cron/reminders/route.js.
//
// THE RULES (all in REMINDER_POLICY below, so they're easy to change)
// -------------------------------------------------------------------
//  - A request is "due a reminder" when it is OPEN and 3 days have passed
//    since the last reminder (or since it was created, if none was sent).
//  - A request gets at most 3 reminders in total. After that we stop: more
//    emails would only annoy the client. The team still sees the blocked
//    days in the dashboard and can follow up personally.
//  - ONE email per project per run: if a client has 3 due requests they get
//    one email listing all 3, not three emails.
//  - A project is not reminded again within 2 days of its last reminder,
//    even if different requests become due on different days.
//  - Projects that are COMPLETED or ON_HOLD, and projects with no client,
//    are never reminded.
//
// WHY EACH LIMIT HAS 2 HOURS OF SLACK
// Vercel Hobby cron runs once a day at a time that can drift by up to an
// hour (see the platform docs). Exactly "3 days" could therefore miss the
// cutoff by a few minutes and push the reminder to the next day.
//
// SAFE TO RUN TWICE (no duplicate emails)
// Before emailing, each request is CLAIMED with a conditional update that
// only succeeds if nobody else changed it (`remindersSent` and
// `lastRemindedAt` must still hold the values we read). If two runs overlap,
// only one claim wins and only that run sends the email. If the email then
// fails, the claim is rolled back so the request is retried on the next run
// instead of silently losing a reminder.

import prisma from './prisma.js'
import { sendEmail } from './email.js'
import { clientRequestReminderEmail } from './emailTemplates.js'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const SLACK_MS = 2 * HOUR_MS

export const REMINDER_POLICY = Object.freeze({
  MAX_PER_REQUEST: 3,
  REQUEST_GAP_MS: 3 * DAY_MS - SLACK_MS,
  PROJECT_GAP_MS: 2 * DAY_MS - SLACK_MS,
  BATCH_LIMIT: 200, // requests examined per run; the rest wait for tomorrow
})

export async function sendDueRequestReminders({ now = new Date(), db = prisma } = {}) {
  const summary = { candidates: 0, emailsSent: 0, emailsFailed: 0, projectsSkipped: 0 }

  const base = process.env.NEXTAUTH_URL
  if (!base) {
    console.error('[Cron] NEXTAUTH_URL is not set - cannot build portal links, skipping request reminders.')
    return { ...summary, error: 'NEXTAUTH_URL is not set' }
  }
  const portalBase = base.replace(/\/+$/, '')

  const requestCutoff = new Date(now.getTime() - REMINDER_POLICY.REQUEST_GAP_MS)
  const projectCutoff = new Date(now.getTime() - REMINDER_POLICY.PROJECT_GAP_MS)

  const candidates = await db.clientRequest.findMany({
    where: {
      status: 'OPEN',
      remindersSent: { lt: REMINDER_POLICY.MAX_PER_REQUEST },
      OR: [
        { lastRemindedAt: null, createdAt: { lte: requestCutoff } },
        { lastRemindedAt: { lte: requestCutoff } },
      ],
      project: { status: 'ACTIVE', client: { isNot: null } },
    },
    orderBy: { createdAt: 'asc' },
    take: REMINDER_POLICY.BATCH_LIMIT,
    select: {
      id: true,
      title: true,
      dueDate: true,
      remindersSent: true,
      lastRemindedAt: true,
      project: {
        select: {
          id: true,
          name: true,
          user: { select: { name: true } },
          client: { select: { name: true, email: true, magicToken: true } },
        },
      },
    },
  })

  summary.candidates = candidates.length
  if (candidates.length === REMINDER_POLICY.BATCH_LIMIT) {
    console.warn('[Cron] Request reminder batch limit reached; remaining requests will be handled on the next run.')
  }

  // Group by project: one email per project.
  const groups = new Map()
  for (const request of candidates) {
    const key = request.project.id
    if (!groups.has(key)) groups.set(key, { project: request.project, requests: [] })
    groups.get(key).requests.push(request)
  }

  // Sequential on purpose (same reasoning as the milestone reminders in the
  // route): email providers rate-limit, and a daily job has no need for speed.
  for (const { project, requests } of groups.values()) {
    try {
      const client = project.client
      if (!client?.email) {
        summary.projectsSkipped += 1
        continue
      }

      // Cooldown: was this project reminded recently (via ANY of its requests)?
      const recent = await db.clientRequest.findFirst({
        where: { projectId: project.id, lastRemindedAt: { gt: projectCutoff } },
        select: { id: true },
      })
      if (recent) {
        summary.projectsSkipped += 1
        continue
      }

      // Claim each request. Only the claims that succeed go in the email.
      const claimed = []
      for (const request of requests) {
        const claim = await db.clientRequest.updateMany({
          where: {
            id: request.id,
            status: 'OPEN',
            remindersSent: request.remindersSent,
            lastRemindedAt: request.lastRemindedAt, // null matches "IS NULL"
          },
          data: { remindersSent: { increment: 1 }, lastRemindedAt: now },
        })
        if (claim.count === 1) claimed.push(request)
      }
      if (claimed.length === 0) {
        summary.projectsSkipped += 1
        continue
      }

      const { subject, html } = clientRequestReminderEmail({
        clientName: client.name,
        freelancerName: project.user?.name ?? 'Your project team',
        projectName: project.name,
        requests: claimed.map((r) => ({ title: r.title, dueDate: r.dueDate })),
        portalUrl: `${portalBase}/portal/${client.magicToken}`,
        now,
      })

      const result = await sendEmail({ to: client.email, subject, html })

      if (result.success) {
        summary.emailsSent += 1
      } else {
        summary.emailsFailed += 1
        // Undo OUR claims (the `where` only matches rows still holding the
        // values our claim wrote) so tomorrow's run tries again.
        for (const request of claimed) {
          try {
            await db.clientRequest.updateMany({
              where: {
                id: request.id,
                remindersSent: request.remindersSent + 1,
                lastRemindedAt: now,
              },
              data: { remindersSent: request.remindersSent, lastRemindedAt: request.lastRemindedAt },
            })
          } catch (rollbackError) {
            // Worst case: one reminder is skipped. Never a duplicate.
            console.error('[Cron] Could not roll back reminder claim for request', request.id, rollbackError)
          }
        }
      }
    } catch (err) {
      // One project's problem must not stop the others.
      summary.emailsFailed += 1
      console.error('[Cron] Request reminder failed for project', project.id, err)
    }
  }

  return summary
}