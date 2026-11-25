// app/api/cron/billing-reconcile/route.js
//
// Daily billing reconciliation, called by the scheduler in vercel.json
// with Authorization: Bearer <CRON_SECRET>. See lib/billing/reconcile.js.

import prisma from '@/lib/prisma'
import { razorpay } from '@/lib/billing/razorpay'
import { runBillingReconcile } from '@/lib/billing/reconcile'
import { notifyBillingAlerts } from '@/lib/billing/alerts'
import { sendEmail } from '@/lib/email'
import { isCronAuthorized } from '@/lib/billing/cron-auth'

export const maxDuration = 300

export async function GET(request) {
  if (!isCronAuthorized(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { summary, alerts } = await runBillingReconcile({ prisma, razorpay })
    await notifyBillingAlerts(alerts, { sendEmail })
    console.log('[billing-reconcile]', JSON.stringify(summary))
    return Response.json(summary)
  } catch (error) {
    console.error('[billing-reconcile] failed:', error?.message ?? error)
    return Response.json({ error: 'Reconciliation failed' }, { status: 500 })
  }
}
