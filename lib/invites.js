// lib/invites.js
//
// Owns the full lifecycle of a workspace invite: creating one, listing
// the pending ones for a workspace, revoking one, and accepting one.
// Nothing outside this file should touch prisma.workspaceInvite
// directly — same centralization reasoning as lib/workspace.js.
//
// Role checks (OWNER/ADMIN can invite) are NOT done in here — that
// matches the existing pattern where requireRole() is called at the API
// ROUTE level (see app/api/projects/[id]/route.js), not inside lib
// functions. Every function below assumes the caller already confirmed
// the user is allowed to do this.
//
// About the /** ... */ comments with @param: this file is plain
// JavaScript, so TypeScript files that import it learn the types from
// these comments.
//
// A rule used several times below: NEVER pass a possibly-undefined value
// into a Prisma `where`. `where: { id: undefined }` does not mean "no
// match" — Prisma treats it as "no filter" and matches EVERYTHING. So
// every id that can come from outside is checked with isNonEmptyString()
// first.

import { randomUUID } from 'crypto'
import prisma from './prisma.js'
import { sendEmail } from './email.js'
import { workspaceInviteEmail } from './emailTemplates.js'
import { NotFoundError, ForbiddenError, LimitExceededError } from './errors.js'
import { assertWithinLimit } from './billing/entitlements.js'
import { notifyWorkspaceInvite } from './notifications/triggers.js'

const INVITE_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

// The only roles an invite is allowed to grant. OWNER is deliberately
// missing: an OWNER can't be removed through removeMember(), so handing
// OWNER out through an invite link would create a permanent, unremovable
// owner. If you ever want owner transfer, build it as its own feature.
const INVITABLE_ROLES = ['ADMIN', 'MEMBER']

/** @param {unknown} value */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

// Single source of truth for "what state is this invite REALLY in
// right now" — used by listInvites, getInviteByToken, and acceptInvite,
// so all three agree on the same answer instead of each computing
// their own slightly-different version of "is this expired."
//
// Returns one of: 'PENDING' | 'EXPIRED' | 'REVOKED' | 'ACCEPTED'
// 'EXPIRED' is computed from expiresAt, not read off a stored status —
// see the InviteStatus enum comment in schema.prisma for why.
/** @param {{ status: string, expiresAt: Date }} invite */
function getInviteEffectiveStatus(invite) {
  if (invite.status === 'ACCEPTED') return 'ACCEPTED'
  if (invite.status === 'REVOKED') return 'REVOKED'
  if (invite.expiresAt < new Date()) return 'EXPIRED'
  return 'PENDING'
}

// The base URL used to build the link inside invite emails. Throws if
// NEXTAUTH_URL is missing, so we find out BEFORE saving an invite instead
// of emailing people a broken "undefined/invite/..." link. (NextAuth v4
// already requires this variable in production.)
function getAppBaseUrl() {
  const baseUrl = process.env.NEXTAUTH_URL
  if (!baseUrl) {
    throw new Error('NEXTAUTH_URL is not set, so invite links cannot be built.')
  }
  return baseUrl.replace(/\/+$/, '') // drop trailing slashes: no "//invite/"
}

// Composes the invite template + the generic sendEmail() into one call.
/**
 * @param {string} to
 * @param {{ workspaceName: string, inviterName: string, acceptUrl: string }} details
 */
export async function sendInviteEmail(to, { workspaceName, inviterName, acceptUrl }) {
  const { subject, html } = workspaceInviteEmail({ inviterName, workspaceName, acceptUrl })
  return sendEmail({ to, subject, html })
}

// Creates a new invite, OR revives an existing one if this email was
// already invited to this workspace before (and later revoked/expired).
//
// Step by step:
//   1. Check the role is one an invite may grant, and that the app URL
//      is configured. Both checks run BEFORE anything is saved.
//   2. Generate a fresh token ourselves, in JS — NOT relying on the
//      schema's @default(cuid()) for this. Prisma defaults only apply
//      when a row is CREATED and the field is omitted. On the UPDATE
//      half of an upsert, defaults never fire. Since a re-invite must
//      get a brand-new token (so an old, leaked link stops working), we
//      supply the value explicitly in BOTH the create and update branches.
//   3. upsert() on the @@unique([workspaceId, email]) constraint —
//      Prisma auto-names this compound key `workspaceId_email`. Using
//      create() here would throw on the second invite to the same email.
//   4. Send the email. A failed email must never undo an invite that is
//      already safely saved, so failures are logged, not thrown. This
//      includes sendEmail() THROWING (not only returning success: false).
//   5. Create the in-app notification, with the same treatment.
/**
 * @param {string} workspaceId
 * @param {{ email: string, role: string, invitedByUserId: string }} input
 * @param {import('./prisma.js').DbClient} [db]
 */
export async function createInvite(workspaceId, { email, role, invitedByUserId }, db = prisma) {
  if (!INVITABLE_ROLES.includes(role)) {
    throw new ForbiddenError(`Invites can only grant one of these roles: ${INVITABLE_ROLES.join(', ')}.`)
  }
  const baseUrl = getAppBaseUrl()

  // Normalized HERE, not just wherever this gets called from — a
  // function that centralizes a rule is only as good as its weakest
  // caller. @@unique([workspaceId, email]) in schema.prisma is
  // case-sensitive at the database level; without this, "Test@x.com"
  // and "test@x.com" would be treated as two different invites instead
  // of the same re-invite. Matches the normalization signup does for
  // User.email.
  const normalizedEmail = email.trim().toLowerCase()

  // If this email already belongs to a member of THIS workspace, don't
  // create a pointless invite — tell the caller now, with a clear reason.
  const existingUser = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  })
  if (existingUser) {
    const alreadyMember = await db.workspaceMember.findFirst({
      where: { userId: existingUser.id, workspaceId },
    })
    if (alreadyMember) {
      throw new ForbiddenError('This person is already a member of this workspace.')
    }
  }

  const token = randomUUID()
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS)

  const invite = await db.workspaceInvite.upsert({
    where: {
      workspaceId_email: { workspaceId, email: normalizedEmail },
    },
    create: {
      workspaceId,
      email: normalizedEmail,
      role,
      status: 'PENDING',
      token,
      expiresAt,
      invitedByUserId,
    },
    update: {
      role, // in case they're re-inviting with a different role than last time
      status: 'PENDING', // resets a REVOKED row back to an active invite
      token,
      expiresAt,
      invitedByUserId,
    },
  })

  const [workspace, inviter] = await Promise.all([
    db.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } }),
    db.user.findUnique({ where: { id: invitedByUserId }, select: { name: true } }),
  ])

  const acceptUrl = `${baseUrl}/invite/${token}`

  // The invite row exists and is valid whether or not the email goes out.
  // A future "Resend" button reuses this same function (upsert handles it).
  let emailResult
  try {
    emailResult = await sendInviteEmail(normalizedEmail, {
      workspaceName: workspace?.name ?? 'a workspace',
      inviterName: inviter?.name ?? 'Someone',
      acceptUrl,
    })
  } catch (err) {
    emailResult = { success: false, error: err }
  }
  if (!emailResult?.success) {
    console.error('createInvite: invite saved, but the email failed to send', emailResult?.error)
  }

  // In-app notification, independent of the email above.
  //
  // It is AWAITED (inside try/catch) instead of left running in the
  // background. A background promise has two problems: on serverless
  // hosts the function can be frozen right after the response is sent,
  // killing the write half-way; and if `db` is a transaction client,
  // the transaction may already be closed by the time the write runs.
  // Awaiting costs a few milliseconds and removes both problems. The
  // try/catch keeps the original rule: a notification failure must never
  // undo an invite that is already saved.
  try {
    await notifyWorkspaceInvite(invite, workspace?.name ?? 'a workspace', db)
  } catch (err) {
    console.error('createInvite: invite saved, but the notification failed to be created', err)
  }

  return invite
}

// Lists PENDING invites for a workspace — feeds the "pending invites"
// section of the Team page.
//
// Deliberately never returns `token`. The token only ever needs to
// exist inside the email itself — returning it here would mean anyone
// who can view the Team page could read out and reuse someone else's
// invite link before they'd even opened their email.
//
// isExpired is computed here from expiresAt, not read off a stored
// EXPIRED status — see the InviteStatus enum comment in schema.prisma.
/**
 * @param {string} workspaceId
 * @param {import('./prisma.js').DbClient} [db]
 */
export async function listInvites(workspaceId, db = prisma) {
  // Without this guard, an undefined workspaceId would list the pending
  // invites of EVERY workspace (see the note at the top of this file).
  if (!isNonEmptyString(workspaceId)) {
    throw new NotFoundError('Workspace not found.')
  }

  const invites = await db.workspaceInvite.findMany({
    where: { workspaceId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    include: {
      invitedBy: { select: { name: true } },
    },
  })

  return invites.map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    invitedByUserId: invite.invitedByUserId,
    // null when the inviter's account was later deleted (onDelete: SetNull
    // on WorkspaceInvite.invitedBy). The frontend needs a real fallback
    // label for this case, not a blank space.
    invitedByName: invite.invitedBy?.name ?? null,
    createdAt: invite.createdAt,
    expiresAt: invite.expiresAt,
    isExpired: getInviteEffectiveStatus(invite) === 'EXPIRED',
  }))
}

// Looks up PENDING invites addressed TO a given email, across ALL
// workspaces — not scoped to any single workspaceId, unlike
// listInvites above. Powers "Invites for you" on the Team page.
//
// SECURITY NOTE, since this is the one place in this file that returns
// the raw token: every row it returns is, by construction, addressed to
// the exact email that asked for it, so returning the token here is
// handing someone their own key, not leaking anyone else's. This safety
// property depends ENTIRELY on the caller passing a trustworthy email —
// it must come from the authenticated session, never from client input.
/**
 * @param {string} email
 * @param {import('./prisma.js').DbClient} [db]
 */
export async function listReceivedInvites(email, db = prisma) {
  if (!isNonEmptyString(email)) return []

  const normalizedEmail = email.trim().toLowerCase()

  const invites = await db.workspaceInvite.findMany({
    where: { email: normalizedEmail, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    include: {
      workspace: { select: { name: true } },
      invitedBy: { select: { name: true } },
    },
  })

  return invites.map((invite) => ({
    id: invite.id,
    token: invite.token,
    workspaceId: invite.workspaceId,
    workspaceName: invite.workspace.name,
    inviterName: invite.invitedBy?.name ?? null,
    role: invite.role,
    createdAt: invite.createdAt,
    expiresAt: invite.expiresAt,
    isExpired: getInviteEffectiveStatus(invite) === 'EXPIRED',
  }))
}

// Looks up an invite by its public token, for the accept page to
// render. Returns null for a token that matches no invite at all —
// the ONLY case the calling route should treat as a real 404. Every
// other outcome (expired, revoked, already accepted) is a successful
// lookup that just carries a status the frontend needs to explain to
// the person — "this invite was already used," not "page not found."
//
// Deliberately does NOT return the token itself (the caller already
// has it — it's in the URL) or the workspaceId (the accept action only
// needs the token, not this id, to do its job).
/**
 * @param {string} token
 * @param {import('./prisma.js').DbClient} [db]
 */
export async function getInviteByToken(token, db = prisma) {
  // A non-string token would make Prisma throw a validation error (a 500).
  // It can't match any invite, so treat it as "no such invite".
  if (!isNonEmptyString(token)) return null

  const invite = await db.workspaceInvite.findUnique({
    where: { token },
    include: {
      workspace: { select: { name: true } },
      invitedBy: { select: { name: true } },
    },
  })

  if (!invite) return null

  return {
    email: invite.email,
    role: invite.role,
    workspaceName: invite.workspace.name,
    inviterName: invite.invitedBy?.name ?? null, // null if the inviter's account was later deleted
    status: getInviteEffectiveStatus(invite),
  }
}

// Cancels a pending invite before it's accepted.
//
// Scoped by BOTH id AND workspaceId — same pattern as
// DELETE /api/projects/[id]/route.js. This isn't optional: without the
// workspaceId check, an ADMIN in Workspace A could revoke an invite
// belonging to Workspace B just by guessing invite ids.
//
// If the invite isn't currently PENDING (already accepted, or already
// revoked), we throw instead of silently doing nothing.
//
// The final write is a "compare and set": `updateMany` with
// `status: 'PENDING'` in its where. Reason: between our read and our
// write, someone could ACCEPT this invite. A plain update-by-id would
// then overwrite ACCEPTED with REVOKED, leaving a member whose invite
// says "revoked". With the status in the where, the update simply
// matches 0 rows in that case, and we report it.
/**
 * @param {string} inviteId
 * @param {string} workspaceId
 * @param {import('./prisma.js').DbClient} [db]
 */
export async function revokeInvite(inviteId, workspaceId, db = prisma) {
  // An undefined inviteId would match ANY invite in the workspace, and we
  // would revoke a random one. Reject it up front.
  if (!isNonEmptyString(inviteId) || !isNonEmptyString(workspaceId)) {
    throw new NotFoundError('Invite not found.')
  }

  const invite = await db.workspaceInvite.findFirst({
    where: { id: inviteId, workspaceId },
  })

  if (!invite) {
    throw new NotFoundError('Invite not found.')
  }

  if (invite.status !== 'PENDING') {
    throw new ForbiddenError(
      `This invite is already ${invite.status.toLowerCase()} and can't be revoked.`
    )
  }

  const result = await db.workspaceInvite.updateMany({
    where: { id: inviteId, workspaceId, status: 'PENDING' },
    data: { status: 'REVOKED' },
  })

  if (result.count === 0) {
    throw new ForbiddenError("This invite was just used or revoked, so it can't be revoked now.")
  }

  return { id: inviteId, status: 'REVOKED' }
}

// Accepts an invite: validates the token, checks that the invite was
// really sent to THIS user's email, re-checks the seat limit under an
// advisory lock (same pattern as app/api/projects/route.js), creates the
// WorkspaceMember with the invite's role, marks the invite ACCEPTED, and
// switches the user's activeWorkspaceId to this workspace.
//
// Same shape as app/api/projects/route.js, so you can compare them:
//   projects route                                  this function
//   requireWorkspaceMembership → workspaceId      | look up invite by token → workspaceId
//   prisma.$transaction(async (tx) => {...})      | same
//   tx.$executeRaw`pg_advisory_xact_lock(...)`    | identical call, same key
//   assertWithinLimit(workspaceId, 'maxProjects') | assertWithinLimit(workspaceId, 'maxWorkspaceMembers')
//   tx.project.create({ ... })                    | tx.workspaceMember.create({ ... })
//
// LAYERING NOTE: this function does NOT take a `db` param. It always
// opens and owns its own transaction, because Prisma doesn't support
// nesting one interactive transaction inside another. So for the
// invite-signup flow, "create the user + personal workspace" and "accept
// the invite" are TWO sequential transactions. That's fine: if accepting
// fails right after signup succeeds, the user still has a fully working
// account with their own workspace — a recoverable state.
/**
 * @param {string} token
 * @param {string} userId
 */
export async function acceptInvite(token, userId) {
  if (!isNonEmptyString(token)) {
    throw new NotFoundError('This invite link is invalid.')
  }
  // An undefined userId would make the "already a member" check below
  // match ANY member of the workspace. Reject it up front.
  if (!isNonEmptyString(userId)) {
    throw new ForbiddenError('You must be signed in to accept an invite.')
  }

  // Cheap, unlocked read first. No point opening a transaction and
  // taking a workspace-wide lock for a token that doesn't even exist.
  const precheck = await prisma.workspaceInvite.findUnique({ where: { token } })
  if (!precheck) {
    throw new NotFoundError('This invite link is invalid.')
  }

  const workspaceId = precheck.workspaceId

  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${workspaceId}))`

      // Re-fetch through the SAME locked connection — the invite could
      // have been revoked, or accepted by someone else, in the gap
      // between the read above and getting this lock.
      const invite = await tx.workspaceInvite.findUnique({ where: { token } })
      if (!invite) {
        throw new NotFoundError('This invite link is invalid.')
      }
      const effectiveStatus = getInviteEffectiveStatus(invite)
      if (effectiveStatus === 'REVOKED') {
        throw new ForbiddenError('This invite has been revoked.')
      }
      if (effectiveStatus === 'ACCEPTED') {
        throw new ForbiddenError('This invite has already been used.')
      }
      if (effectiveStatus === 'EXPIRED') {
        throw new NotFoundError('This invite has expired. Ask for a new one.')
      }

      // Never hand out more than an invite is allowed to grant, even if an
      // old or hand-edited row says otherwise. Without this, a row with
      // role OWNER would create an unremovable owner.
      if (!INVITABLE_ROLES.includes(invite.role)) {
        throw new ForbiddenError('This invite has an invalid role. Ask for a new one.')
      }

      // The invite was sent to ONE email address. Without this check,
      // anyone who got hold of the link (forwarded email, shared screen,
      // leaked log) could sign in with any account and join the workspace.
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { email: true },
      })
      if (!user) {
        throw new NotFoundError('Your account could not be found.')
      }
      if (user.email.trim().toLowerCase() !== invite.email.trim().toLowerCase()) {
        throw new ForbiddenError(
          'This invite was sent to a different email address. Sign in with the invited email to accept it.'
        )
      }

      const alreadyMember = await tx.workspaceMember.findFirst({
        where: { userId, workspaceId },
      })
      if (alreadyMember) {
        throw new ForbiddenError('You are already a member of this workspace.')
      }

      // THE authoritative seat-limit check. The check at invite-CREATION
      // time is only a fail-fast UX nicety — it happens without a lock, so
      // it can't stop the race (several invites sent while under the
      // limit, then all accepted later). This check is the one that really
      // enforces it, because it runs under the lock, right before the insert.
      const seatCheck = await assertWithinLimit(workspaceId, 'maxWorkspaceMembers', tx)
      if (!seatCheck.allowed) {
        throw new LimitExceededError(seatCheck.reason)
      }

      await tx.workspaceMember.create({
        data: {
          userId,
          workspaceId,
          // From the invite — NEVER omitted. Leaving this out would fall
          // through to WorkspaceMember.role's schema default, which is OWNER.
          role: invite.role,
        },
      })

      await tx.workspaceInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' },
      })

      // Switch the user onto this workspace. If this call happened right
      // after a fresh signup, this line makes sure they land on the
      // workspace they were invited to, not the empty personal one that
      // was just created for them (see createWorkspaceForUser).
      await tx.user.update({
        where: { id: userId },
        data: { activeWorkspaceId: workspaceId },
      })

      return { workspaceId, role: invite.role }
    },
    {
      // Prisma's defaults (2s to get a connection, 5s to finish) are tight
      // for a transaction that first WAITS on a lock other accepts may hold.
      maxWait: 5_000,
      timeout: 15_000,
    }
  )
}