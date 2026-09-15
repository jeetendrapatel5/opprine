// lib/rate-limit.js
//
// A best-effort, in-memory, sliding-window rate limiter.
//
// ── Please read this before trusting it for more than it offers ──
//
// This `hits` Map lives in ONE serverless function instance's memory.
// On Vercel, traffic can be spread across several different instances
// at once, each with its OWN empty Map — so this does NOT give a
// hard, guaranteed limit across your whole deployment. A determined
// attacker spreading requests across many cold starts could get more
// through than the numbers below suggest.
//
// That's why it is used here only as an EXTRA layer, on top of
// protections that actually are reliable no matter how many instances
// are involved, because they live in the database instead of in
// memory:
//   - the resend cooldown, checked against PasswordReset.createdAt
//   - the OTP attempt limit, enforced via PasswordReset.attempts
//     (see lib/password-reset.js for both)
//
// If Opprine outgrows this (real sustained abuse, not just
// "good enough for now"), the standard upgrade is a shared store —
// e.g. Upstash Redis via the @upstash/ratelimit package. You'd swap
// the body of checkRateLimit() for a Redis call; every route that
// calls it below stays exactly the same.

const hits = new Map(); // key -> array of hit timestamps (ms)

export function checkRateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);

  // Housekeeping: once the map gets large, drop any key whose every
  // recorded hit has already aged out of its window. Without this,
  // a warm serverless instance handling lots of distinct IPs over a
  // long time would let this Map grow without bound.
  if (hits.size > 5000) {
    for (const [k, timestamps] of hits) {
      if (timestamps.every((t) => now - t > windowMs)) hits.delete(k);
    }
  }

  return {
    allowed: recent.length <= limit,
    remaining: Math.max(0, limit - recent.length),
  };
}

// Best-effort client IP extraction. `x-forwarded-for` can contain a
// comma-separated chain of proxies the request passed through — the
// FIRST address is the original client, so that's the one we want.
export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}