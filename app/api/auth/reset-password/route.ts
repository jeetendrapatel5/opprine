import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { resetPassword } from "@/lib/password-reset";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  resetToken: z.string().min(32).max(256),
  // Same minimum your signup route already enforces (route.ts:
  // "Password must be at least 8 characters long") — kept consistent
  // rather than inventing a stricter rule just for this flow.
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

const INVALID_MESSAGE = "This reset session is invalid or has expired. Please start over.";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  const { allowed } = checkRateLimit(`reset-password:${ip}`, {
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
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || "Invalid request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const result = await resetPassword(
      parsed.data.email,
      parsed.data.resetToken,
      parsed.data.password
    );

    if (!result.ok) {
      return NextResponse.json({ error: INVALID_MESSAGE }, { status: 400 });
    }

    return NextResponse.json({ message: "Password updated successfully." });
  } catch (error) {
    // Never log parsed.data here — it contains the new password in
    // plaintext (pre-hash) and the reset token.
    console.error("reset-password: internal error while processing request");
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}