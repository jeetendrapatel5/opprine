import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { startPasswordReset } from "@/lib/password-reset";

// z.string().email() rejects a malformed shape (no @, no domain) —
// that's a real validation error and gets a real 400 below. It's NOT
// an account-enumeration risk, because "not-an-email" can never match
// a real account either way; enumeration is specifically about a
// well-formed email revealing whether ITS account exists, which is
// what the GENERIC_MESSAGE below prevents.
const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

// This exact message is returned whether the email belongs to an
// account or not, whether a code was actually (re)sent or the resend
// cooldown silently absorbed the request, and even if something
// unexpected failed internally. See startPasswordReset() in
// lib/password-reset.js — it's written so every one of those paths
// takes roughly the same amount of time, too.
const GENERIC_MESSAGE =
  "If an account exists with this email, we've sent a verification code.";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  // 10 requests / 15 minutes per IP. A best-effort extra layer (see
  // lib/rate-limit.js for its limitations) — the resend cooldown
  // enforced inside startPasswordReset() is the reliable protection
  // against spamming any one user's inbox.
  const { allowed } = checkRateLimit(`forgot-password:${ip}`, {
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Malformed JSON body, not a normal validation failure.
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  try {
    await startPasswordReset(parsed.data.email);
  } catch (error) {
    // Log only that something failed — never the email address or
    // any other request data, and never anything from inside
    // startPasswordReset() that could contain a hash or a token.
    console.error("forgot-password: internal error while processing request");
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}