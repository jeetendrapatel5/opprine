// lib/email/password-reset.js
//
// ASSUMPTION FLAGGED: I could see that Opprine uses Resend (it's in
// your dependencies and your memory notes mention a magic-link
// client-portal email), but the file where you already configure a
// Resend client wasn't in the files you shared with me, so this file
// creates its own `new Resend(...)` instance below. If you already
// have a shared client — something like lib/resend.js exporting a
// configured `resend` instance — replace the two lines marked below
// with an import from that file instead, so you're not spinning up a
// second client. Same provider, same env var, either way.
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.FROM_EMAIL ?? 'Freeport <onboarding@resend.dev>'

// The only public function in this file. Deliberately takes the raw
// OTP as a plain argument — this is the ONE place in the whole
// password-reset flow where the plaintext code is allowed to exist
// outside the user's own browser, because it's the email we're
// sending them. lib/password-reset.js calls this immediately after
// hashing the OTP for storage — the plaintext value is never written
// to the database, and this function never returns it or logs it.
export async function sendPasswordResetEmail(email, otp) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Your Opprine password reset code",
    html: buildHtml(otp),
    text: buildText(otp),
  });
}

function buildHtml(otp) {
  return `
    <div style="font-family: -apple-system, 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #18181b;">
      <p style="font-size: 20px; font-weight: 600; letter-spacing: -0.02em; margin: 0 0 24px;">Opprine</p>
      <h1 style="font-size: 18px; font-weight: 600; margin: 0 0 12px;">Reset your password</h1>
      <p style="font-size: 14px; line-height: 1.6; color: #52525b; margin: 0 0 24px;">
        We received a request to reset the password on your Opprine account.
        Enter the code below to continue. If you didn't request this, you can
        safely ignore this email — your password will not be changed.
      </p>
      <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 24px;">
        <span style="font-size: 32px; font-weight: 700; letter-spacing: 0.2em; color: #18181b;">${otp}</span>
      </div>
      <p style="font-size: 13px; color: #71717a; margin: 0 0 8px;">
        This code expires in 10 minutes and can only be used once.
      </p>
      <p style="font-size: 13px; color: #71717a; margin: 0;">
        Never share this code with anyone — Opprine staff will never ask you for it.
      </p>
    </div>
  `;
}

function buildText(otp) {
  return [
    "Opprine password reset",
    "",
    `Your verification code is: ${otp}`,
    "",
    "This code expires in 10 minutes and can only be used once.",
    "If you didn't request this, you can ignore this email.",
    "Never share this code with anyone.",
  ].join("\n");
}