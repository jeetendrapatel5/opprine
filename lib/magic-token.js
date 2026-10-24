// lib/magic-token.js
//
// The client's magic link (/portal/<token>) is their ONLY credential: whoever
// holds the link can see the project and answer requests. So the token must
// be impossible to guess.
//
// WHY NOT cuid()
// The schema used to create tokens with cuid(). A cuid is built from a
// timestamp, a counter and a machine fingerprint, leaving only about 41
// random bits. That is not trivially guessable, and its author has deprecated
// it for exactly this kind of use, but a secret should come straight from a
// cryptographically secure random source. generateMagicToken() does that:
// 32 random bytes = 256 bits, written as 43 URL-safe characters.
//
// No dependency on the database or on Next.js, so scripts can import it.

import { randomBytes } from 'node:crypto'

export function generateMagicToken() {
  return randomBytes(32).toString('base64url')
}

// Old tokens are cuids: 25 characters, a "c" followed by 24 lowercase letters
// and digits. (New tokens are 43 URL-safe characters; the schema's fallback
// uuid() default gives 36 characters with dashes. Neither can match this.)
export function isLegacyMagicToken(token) {
  return typeof token === 'string' && /^c[a-z0-9]{24}$/.test(token)
}

// Replaces old cuid-style tokens with strong ones.
//
// ROTATING A TOKEN KILLS THE OLD LINK. Any portal link already emailed to the
// client (or bookmarked by them) stops working, and you must send them the new
// one. That is why this does nothing unless `apply` is true: the default is a
// dry run that only counts.
//
//   db         a Prisma client (or transaction client)
//   apply      false (default) = just count; true = really rotate
//   projectId  optional: only this project's client
//
// Returns { total, legacy, rotated: [{ projectId, projectName, clientEmail, token }], skipped }
// Each update only succeeds if the token is still the one we read, so a token
// that changed in the meantime is never overwritten (it is counted as skipped).
export async function rotateLegacyMagicTokens({ db, apply = false, projectId = null }) {
  const clients = await db.client.findMany({
    where: projectId ? { projectId } : {},
    select: {
      id: true,
      email: true,
      magicToken: true,
      projectId: true,
      project: { select: { name: true } },
    },
  })

  const legacy = clients.filter((client) => isLegacyMagicToken(client.magicToken))
  const result = { total: clients.length, legacy: legacy.length, rotated: [], skipped: 0 }
  if (!apply) return result

  for (const client of legacy) {
    const token = generateMagicToken()
    const { count } = await db.client.updateMany({
      where: { id: client.id, magicToken: client.magicToken },
      data: { magicToken: token },
    })
    if (count === 1) {
      result.rotated.push({
        projectId: client.projectId,
        projectName: client.project?.name ?? '',
        clientEmail: client.email,
        token,
      })
    } else {
      result.skipped += 1
    }
  }
  return result
}