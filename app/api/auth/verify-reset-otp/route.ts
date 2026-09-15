import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyResetOtp } from "@/lib/password-reset";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

// One identical message for every failure reason (wrong code, no such
// account, expired, already used, too many attempts) — see
// verifyResetOtp() in lib/password-reset.js for why they're not
// distinguished.
const INVALID_MESSAGE = "That code is invalid or has expired. Please request a new one.";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  // 20 requests / 15 minutes per IP — deliberately higher than the
  // other two routes, since a real user legitimately mistyping a
  // 6-digit code a couple of times is normal. The actual brute-force
  // defense is the 5-attempt lockout enforced in the database inside
  // verifyResetOtp(), not this number.
  const { allowed } = checkRateLimit(`verify-otp:${ip}`, {
    limit: 20,
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
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please enter a valid 6-digit code." },
      { status: 400 }
    );
  }

  try {
    const result = await verifyResetOtp(parsed.data.email, parsed.data.otp);
    if (!result.ok) {
      return NextResponse.json({ error: INVALID_MESSAGE }, { status: 400 });
    }

    // result.resetToken is returned exactly once, right here — it's
    // never stored anywhere in plaintext (lib/otp.js hashes it before
    // it's saved), so this response is the only place this value ever
    // exists outside the user's own browser. The frontend holds onto
    // it in memory (never localStorage) and sends it back in step 3.
    return NextResponse.json({ resetToken: result.resetToken });
  } catch (error) {
    console.error("verify-reset-otp: internal error while processing request");
    return NextResponse.json({ error: INVALID_MESSAGE }, { status: 400 });
  }
}