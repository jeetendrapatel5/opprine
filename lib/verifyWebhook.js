import crypto from 'crypto';

export function verifyGithubSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader) return false;

  // Recompute what the signature SHOULD be, using our stored secret
  const expectedSignature =
    'sha256=' +
    crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expectedSignature);

  // Different lengths means different strings — reject immediately
  if (a.length !== b.length) return false;

  // timingSafeEqual compares byte-by-byte in constant time, so an attacker
  // can't guess the secret by measuring how fast wrong guesses get rejected
  return crypto.timingSafeEqual(a, b);
}