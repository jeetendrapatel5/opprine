// lib/otp.js
//
// Small, dependency-free crypto helpers used only by
// lib/password-reset.js. Kept in their own file so the security-
// sensitive "how do we generate/hash/compare a secret" logic is in
// exactly one place, instead of copy-pasted across three API routes.
import crypto from "crypto";
import bcrypt from "bcryptjs";

// ── OTP (the 6-digit code emailed to the user) ────────────────────────

// crypto.randomInt is Node's cryptographically-secure random number
// generator. Math.random() would NOT be safe here — it's not designed
// to be unpredictable, and in some JS engines its internal state can
// be recovered from a handful of outputs, which would let an attacker
// predict future OTPs.
export function generateOtp() {
  const n = crypto.randomInt(0, 1_000_000); // 0 .. 999999
  return n.toString().padStart(6, "0"); // always exactly 6 digits, e.g. "004821"
}

// bcrypt cost factor for OTP hashes. Deliberately SLOW on purpose: an
// OTP only has 1,000,000 possible values (low entropy), so if the
// database ever leaked, a fast hash (sha256, md5) would let an
// attacker try all 1,000,000 combinations in well under a second.
// bcrypt at cost 10 makes that same brute force take hours — which is
// what actually matters, since attempts are also capped at 5 and the
// code expires in 10 minutes regardless.
const OTP_BCRYPT_COST = 10;

export async function hashOtp(otp) {
  return bcrypt.hash(otp, OTP_BCRYPT_COST);
}

export async function compareOtp(otp, hash) {
  return bcrypt.compare(otp, hash);
}

// ── Reset token (the secret that carries the user from step 2 → step 3) ──

// 32 random bytes = 256 bits of entropy. Completely different
// entropy budget than the OTP above, so it gets different treatment
// below.
export function generateResetToken() {
  return crypto.randomBytes(32).toString("hex"); // 64 hex characters
}

// Unlike the OTP, this does NOT use bcrypt. 256 bits of entropy is
// already computationally infeasible to brute-force no matter how
// fast the hash is, so a fast hash (sha256) is fine, and keeps the
// reset-password endpoint quick to respond.
export function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Constant-time comparison for the two hash strings above. Using
// plain `===` here would let an attacker who can measure response
// time narrow down the correct token one byte at a time (each
// comparison exits as soon as it finds a mismatched byte). Both
// inputs are sha256 hex digests, so they're always the same length —
// timingSafeEqual requires that.
export function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}