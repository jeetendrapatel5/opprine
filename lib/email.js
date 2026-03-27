// lib/email.js
//
// Responsibility: one function that sends an email.
// Everything else in the app imports THIS function — never Resend directly.
//
// WHY this abstraction exists:
// If you ever switch from Resend to another email provider (SendGrid, Postmark,
// AWS SES), you change ONE file. Every feature that calls sendEmail() keeps
// working unchanged. This is called the single responsibility principle —
// email-sending knowledge lives in one place.

import { Resend } from 'resend'

// Resend client — initialized once, reused across all calls.
// RESEND_API_KEY must be set in your .env file.
// Get your key at: https://resend.com/api-keys
const resend = new Resend(process.env.RESEND_API_KEY)

// FROM_EMAIL is the address your emails appear to come from.
// Must be a verified domain in your Resend account.
// During development you can use Resend's test address: onboarding@resend.dev
// In production, set this to something like: Freeport <hello@yourdomain.com>
const FROM_EMAIL = process.env.FROM_EMAIL ?? 'Freeport <onboarding@resend.dev>'

// sendEmail — the single function every feature calls.
//
// Parameters:
//   to      — string — recipient email address e.g. "client@example.com"
//   subject — string — email subject line
//   html    — string — full HTML body of the email
//
// Returns:
//   { success: true }  if the email was sent
//   { success: false, error } if something went wrong
//
// WHY we return an object instead of throwing:
// Email is a side effect. If sending fails, we never want it to crash
// the main operation (like saving a milestone to the database).
// The caller decides whether to log the error or silently ignore it.
export async function sendEmail({ to, subject, html }) {
  try {
    const { data, error } = await resend.emails.send({
      from:    FROM_EMAIL,
      to,
      subject,
      html,
    })

    if (error) {
      console.error('[sendEmail] Resend returned an error:', error)
      return { success: false, error }
    }

    console.log('[sendEmail] Sent successfully. ID:', data.id)
    return { success: true }

  } catch (err) {
    console.error('[sendEmail] Unexpected error:', err)
    return { success: false, error: err }
  }
}