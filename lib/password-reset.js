// lib/password-reset.js
//
// All the actual logic for the three-step password-reset flow lives
// here, not in the API routes. Each route in app/api/auth/*-password*
// is a thin wrapper: validate the request shape → call one function
// here → turn the result into an HTTP response. Keeping it here means
// there's exactly one place that understands "what makes an OTP
// valid," instead of that logic being copy-pasted into three routes
// and slowly drifting apart over time — the same reason lib/invites.js
// exists as its own file instead of being inlined into every invite
// route.
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import {
  generateOtp,
  hashOtp,
  compareOtp,
  generateResetToken,
  hashResetToken,
  timingSafeEqual,
} from "@/lib/otp";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between OTP emails
const MAX_OTP_ATTEMPTS = 5;

// A precomputed bcrypt hash of a throwaway string, used purely to
// "waste" roughly the same amount of CPU time a real bcrypt.compare()
// would take, on code paths that don't have a real hash to compare
// against yet (e.g. "this email has no account"). Computed once,
// lazily, the first time it's needed — not on every request, since
// hashing is the expensive part and we only need ONE dummy hash to
// compare against, over and over.
let dummyHashPromise;
function getDummyHash() {
  if (!dummyHashPromise) dummyHashPromise = bcrypt.hash("timing-equalizer", 10);
  return dummyHashPromise;
}

// ─────────────────────────────────────────────────────────────────────
// STEP 1 — POST /api/auth/forgot-password calls this.
//
// Returns nothing, and never throws for "expected" outcomes (no such
// user, resend cooldown active) — the API route always sends back the
// exact same generic message regardless of what happened in here.
// That's the whole point: from the outside, "no account with that
// email" and "code already sent 10 seconds ago" and "brand-new code
// just sent" are all indistinguishable.
// ─────────────────────────────────────────────────────────────────────
export async function startPasswordReset(email) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // No account with this email. Still spend roughly the same amount
    // of time a real request would (a bcrypt compare is the slowest
    // part of the real path), so this branch doesn't finish
    // suspiciously fast and become a timing side-channel for guessing
    // which emails have accounts.
    await bcrypt.compare("noop", await getDummyHash());
    return;
  }

  const existing = await prisma.passwordReset.findUnique({
    where: { userId: user.id },
  });

  if (existing && Date.now() - existing.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    // A code was already sent less than a minute ago — do nothing.
    // The caller gets the same generic message either way, so this is
    // invisible from outside; it just quietly stops someone from
    // spamming the resend button (or a script) into flooding this
    // user's inbox.
    return;
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);

  // ONE row per user (userId is @unique on PasswordReset). This
  // upsert either creates that row for the first time, or — far more
  // often — overwrites whatever was there before. Overwriting IS how
  // "invalidate the previous OTP when a new one is generated" is
  // implemented: the old otpHash is simply gone, replaced by this
  // one, and all the other fields reset to a clean slate too.
  await prisma.passwordReset.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      otpHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
    update: {
      otpHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      attempts: 0,
      verifiedAt: null,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      // Prisma's @default(now()) on createdAt only fires on INSERT,
      // never on UPDATE — so on an update we set it explicitly. This
      // is what makes the resend-cooldown check above ("was the last
      // OTP sent under 60s ago") correct after the first request too.
      createdAt: new Date(),
    },
  });

  // Sent only AFTER the database write above has committed. If the
  // write had failed, we'd never reach this line, so we can't end up
  // in a state where the user received an email promising a code that
  // doesn't actually work.
  await sendPasswordResetEmail(user.email, otp);
}

// ─────────────────────────────────────────────────────────────────────
// STEP 2 — POST /api/auth/verify-reset-otp calls this.
//
// Every failure path — no account, no reset record, expired, already
// verified, too many attempts, wrong code — returns the exact same
// shape: { ok: false }. The API route turns every one of those into
// one identical error message. That's deliberate: if "wrong code"
// looked any different from "too many attempts" or "expired," an
// attacker could use that difference to brute-force faster (e.g. stop
// guessing the moment the message changes from "wrong code" to
// "locked out," which would reveal exactly how many guesses are left).
// ─────────────────────────────────────────────────────────────────────
export async function verifyResetOtp(email, otp) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await bcrypt.compare(otp, await getDummyHash());
    return { ok: false };
  }

  const record = await prisma.passwordReset.findUnique({
    where: { userId: user.id },
  });

  if (!record || record.expiresAt < new Date() || record.verifiedAt) {
    // No record, expired, OR already verified once before (that last
    // one is what makes a captured/replayed "correct OTP" request
    // useless the second time it's sent).
    await bcrypt.compare(otp, await getDummyHash());
    return { ok: false };
  }

  // Atomically increment the attempt counter — a single
  // UPDATE ... SET attempts = attempts + 1 statement. This matters
  // for concurrent requests: if two verification attempts for the
  // same record arrive at nearly the same instant (a double-click, or
  // a script deliberately racing to sneak in more guesses than
  // allowed), Postgres serializes the two increments. Whichever one
  // is processed second sees the ALREADY-incremented number, not the
  // stale one — so the limit below can't be bypassed by parallelizing
  // requests.
  const updated = await prisma.passwordReset.update({
    where: { id: record.id },
    data: { attempts: { increment: 1 } },
  });

  if (updated.attempts > MAX_OTP_ATTEMPTS) {
    return { ok: false }; // locked out — must request a new code
  }

  const matches = await compareOtp(otp, updated.otpHash);
  if (!matches) {
    return { ok: false };
  }

  // Correct code. Issue the step-3 reset token now, and mark this OTP
  // as verified in the same write. verifiedAt being non-null from
  // this point on is the single-use guarantee for the OTP: the check
  // at the top of this function (`record.verifiedAt`) will reject any
  // future call for this record before it even looks at the code
  // again, correct or not.
  const resetToken = generateResetToken();
  await prisma.passwordReset.update({
    where: { id: record.id },
    data: {
      verifiedAt: new Date(),
      resetTokenHash: hashResetToken(resetToken),
      resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  return { ok: true, resetToken };
}

// ─────────────────────────────────────────────────────────────────────
// STEP 3 — POST /api/auth/reset-password calls this.
//
// Consumes the reset token exactly once and updates the password.
// ─────────────────────────────────────────────────────────────────────
export async function resetPassword(email, resetToken, newPassword) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: false };

  const record = await prisma.passwordReset.findUnique({
    where: { userId: user.id },
  });

  if (
    !record ||
    !record.verifiedAt || // must have passed step 2 first
    !record.resetTokenHash ||
    !record.resetTokenExpiresAt ||
    record.resetTokenExpiresAt < new Date()
  ) {
    return { ok: false };
  }

  const providedHash = hashResetToken(resetToken);
  if (!timingSafeEqual(providedHash, record.resetTokenHash)) {
    return { ok: false };
  }

  // Hash the new password with the SAME cost factor (12) your signup
  // route already uses for bcrypt.hash() — keeping this consistent
  // with the rest of the app rather than inventing a different value.
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  return prisma.$transaction(async (tx) => {
    // THIS delete is the actual single-use guarantee — not the checks
    // above. deleteMany() here compiles to one
    // DELETE FROM "PasswordReset" WHERE id = ? statement. If two
    // requests somehow arrive with the same valid token at almost the
    // same moment (a double-submit, or a replay of an intercepted
    // request), Postgres only lets ONE of those DELETEs actually
    // remove the row. The other one's WHERE clause matches zero rows
    // once the first has committed, so `deleted.count` comes back as
    // 0 for it, and we correctly refuse it below — even though it had
    // a perfectly valid token, because that token has already been
    // spent by the other request.
    const deleted = await tx.passwordReset.deleteMany({
      where: { id: record.id },
    });

    if (deleted.count === 0) {
      return { ok: false };
    }

    await tx.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        // See lib/auth.js's jwt() callback — this timestamp is what
        // invalidates any JWT session issued before this exact
        // moment, even though NextAuth's JWT strategy has no
        // server-side session row to delete.
        passwordChangedAt: new Date(),
      },
    });

    return { ok: true };
  });
}