// lib/billing/alerts.js
//
// Operator alerts for billing situations that need a human. Delivery is
// best-effort: a failed alert never fails the request that raised it.

const SUBJECTS = {
  DISPUTE: 'Razorpay dispute update',
  REFUND: 'Razorpay refund recorded',
  UNATTRIBUTED_PAYMENT: 'Razorpay payment not linked to a workspace',
  UNMATCHED_EVENT: 'Razorpay event for an unknown subscription',
  RECONCILE_FAILURES: 'Billing reconciliation had failures',
  CONFLICT_PAYMENT: 'Razorpay payment received for a workspace that already had a subscription',
}

function describe(alert) {
  const { kind, ...details } = alert
  return `${SUBJECTS[kind] ?? kind}\n${JSON.stringify(details, null, 2)}`
}

export async function notifyBillingAlerts(alerts, { sendEmail, to = process.env.BILLING_ALERT_EMAIL } = {}) {
  if (!alerts?.length) return
  for (const alert of alerts) console.error('[billing-alert]', describe(alert))
  if (!to || !sendEmail) return

  const lines = alerts.map((alert) => `<pre>${describe(alert).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>`)
  try {
    await sendEmail({
      to,
      subject: alerts.length === 1 ? (SUBJECTS[alerts[0].kind] ?? 'Billing alert') : `${alerts.length} billing alerts`,
      html: lines.join(''),
    })
  } catch (error) {
    console.error('[billing-alert] delivery failed:', error?.message ?? error)
  }
}
