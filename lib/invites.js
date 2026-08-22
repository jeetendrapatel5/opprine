// lib/invites.js
//
// Owns the full lifecycle of a workspace invite: creating one, listing
// the pending ones for a workspace, revoking one, and (eventually)
// accepting one. Nothing outside this file should touch
// prisma.workspaceInvite directly — same centralization reasoning as
// lib/workspace.js.
//
// Role checks (OWNER/ADMIN can invite) are NOT done in here — that
// matches the existing pattern where requireRole() is called at the API
// ROUTE level (see app/api/projects/[id]/route.js), not inside lib
// functions. Every function below assumes the caller already confirmed
// the user is allowed to do this.

import { randomUUID } from 'crypto'
import prisma from './prisma.js'
import { sendEmail } from './email.js'
import { workspaceInviteEmail } from './emailTemplates.js'
import { NotFoundError, ForbiddenError, LimitExceededError } from './errors.js'
import { assertWithinLimit } from './billing/entitlements.js'

const INVITE_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours — your confirmed decision

// Single source of truth for "what state is this invite REALLY in
// right now" — used by listInvites, getInviteByToken, and acceptInvite,
// so all three agree on the same answer instead of each computing
// their own slightly-different version of "is this expired."
//
// Returns one of: 'PENDING' | 'EXPIRED' | 'REVOKED' | 'ACCEPTED'
// 'EXPIRED' is computed from expiresAt, not read off a stored status —
// see the InviteStatus enum comment in schema.prisma for why.
function getInviteEffectiveStatus(invite) {
  if (invite.status === 'ACCEPTED') return 'ACCEPTED'
  if (invite.status === 'REVOKED') return 'REVOKED'
  if (invite.expiresAt < new Date()) return 'EXPIRED'
  return 'PENDING'
}

// Composes the invite template + the generic sendEmail() into one call.
// This is the lib/invites.js home for the sendInviteEmail(to, {...})
// function your notes asked for — see the chat message above this code
// for why it lives here instead of lib/email.js.
export async function sendInviteEmail(to, { workspaceName, inviterName, acceptUrl }) {
  const { subject, html } = workspaceInviteEmail({ inviterName, workspaceName, acceptUrl })
  return sendEmail({ to, subject, html })
}

// Creates a new invite, OR revives an existing one if this email was
// already invited to this workspace before (and later revoked/expired).
//
// Step by step:
//   1. Generate a fresh token ourselves, in JS — NOT relying on the
//      schema's @default(cuid()) for this. Important detail: Prisma
//      defaults only apply when a row is CREATED and the field is
//      omitted. On the UPDATE half of an upsert, defaults never fire.
//      Since a re-invite must get a brand-new token (so an old, leaked
//      link stops working), we have to supply the value explicitly in
//      BOTH the create and update branches below.
//   2. upsert() on the @@unique([workspaceId, email]) constraint —
//      Prisma auto-names this compound key `workspaceId_email` (field
//      names joined by underscore, in the order they're declared in
//      the @@unique). Using create() here instead would throw on the
//      second invite to the same email, which is exactly the case the
//      changelog flagged.
//   3. Send the email. sendEmail() already returns { success, error }
//      instead of throwing (see lib/email.js) — a failed email send
//      should never undo an invite that's already safely saved in the
//      database, so we log and move on rather than throw.
//
// FLAGGED ASSUMPTION: acceptUrl below uses process.env.NEXTAUTH_URL as
// the app's base URL. NextAuth v4 requires this env var to already
// exist in your project, so it's my best guess for "a base URL that's
// definitely already configured" — but if you already have a different
// variable (e.g. APP_URL) used for the Client.magicToken portal links,
// tell me and I'll switch to that instead for consistency.
export async function createInvite(workspaceId, { email, role, invitedByUserId }, db = prisma) {
  // Normalized HERE, not just wherever this gets called from — a
  // function that centralizes a rule is only as good as its weakest
  // caller. @@unique([workspaceId, email]) in schema.prisma is
  // case-sensitive at the database level; without this, "Test@x.com"
  // and "test@x.com" would be treated as two different invites instead
  // of the same re-invite. Matches the same normalization your signup
  // route already does for User.email.
  const normalizedEmail = email.trim().toLowerCase()

  // If this email already belongs to a member of THIS workspace, don't
  // create a pointless invite — tell the caller now, with a clear
  // reason, instead of letting them find out only when the invitee
  // clicks accept and hits the alreadyMember check inside acceptInvite.
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

  const acceptUrl = `${process.env.NEXTAUTH_URL}/invite/${token}`

  const emailResult = await sendInviteEmail(normalizedEmail, {
    workspaceName: workspace?.name ?? 'a workspace',
    inviterName: inviter?.name ?? 'Someone',
    acceptUrl,
  })

  if (!emailResult.success) {
    // Don't throw — the invite row exists and is valid either way. A
    // future "Resend" button on the Team page is the natural fix for
    // this case, reusing this same function (upsert handles it).
    console.error('createInvite: invite saved, but the email failed to send', emailResult.error)
  }

  return invite
}

// Lists PENDING invites for a workspace — feeds the "pending invites"
// section of the future Team page.
//
// Deliberately never returns `token`. The token only ever needs to
// exist inside the email itself — returning it here would mean anyone
// who can view the Team page (any workspace member, potentially) could
// read out and reuse someone else's invite link before they'd even
// opened their email.
//
// isExpired is computed here from expiresAt, not read off a stored
// EXPIRED status — see the InviteStatus enum comment in schema.prisma
// for why (no status ever needs a background job to "notice" time has
// passed).
export async function listInvites(workspaceId, db = prisma) {
  const invites = await db.workspaceInvite.findMany({
    where: { workspaceId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    // Same join as getInviteByToken below — resolves who sent each
    // invite so the Team page can group/label by sender instead of
    // showing one undifferentiated flat list.
    include: {
      invitedBy: { select: { name: true } },
    },
  })

  return invites.map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    invitedByUserId: invite.invitedByUserId,
    // null when the inviter's account was later deleted — see the
    // onDelete: SetNull comment on WorkspaceInvite.invitedBy in
    // schema.prisma. The frontend needs a real fallback label for this
    // case, not a blank space.
    invitedByName: invite.invitedBy?.name ?? null,
    createdAt: invite.createdAt,
    expiresAt: invite.expiresAt,
    isExpired: getInviteEffectiveStatus(invite) === 'EXPIRED',
  }))
}

// Looks up PENDING invites addressed TO a given email, across ALL
// workspaces — not scoped to any single workspaceId, unlike
// listInvites above. Powers "Invites for you" on the Team page: what's
// been sent to ME, regardless of which workspace I'm currently viewing.
//
// SECURITY NOTE, since this is the one place in this file that returns
// the raw token: listInvites deliberately withholds it (so a workspace
// member can't read out and reuse someone ELSE'S invite link). This
// function is the one legitimate exception — every row it returns is,
// by construction, addressed to the exact email that asked for it, so
// returning the token here is handing someone their own key, not
// leaking anyone else's. This safety property depends ENTIRELY on the
// caller passing a trustworthy email — see the route below, which
// pulls it from the authenticated session, never from client input.
export async function listReceivedInvites(email, db = prisma) {
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
export async function getInviteByToken(token, db = prisma) {
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
    inviterName: invite.invitedBy?.name ?? null, // null if the inviter's account was later deleted — see the onDelete: SetNull comment in schema.prisma
    status: getInviteEffectiveStatus(invite),
  }
}

// Cancels a pending invite before it's accepted.
//
// Scoped by BOTH id AND workspaceId in the same findFirst() — same
// pattern as DELETE /api/projects/[id]/route.js. This isn't optional:
// without the workspaceId check, an ADMIN in Workspace A could revoke
// an invite belonging to Workspace B just by guessing/enumerating
// invite ids, since ids alone don't prove which workspace they're
// scoped to.
//
// If the invite isn't currently PENDING (already accepted, or already
// revoked), we throw instead of silently doing nothing — "already
// accepted" in particular is NOT the same situation as "pending and
// cancellable," and removing someone who already joined is a different,
// not-yet-built feature (removing a WorkspaceMember), not this one.
export async function revokeInvite(inviteId, workspaceId, db = prisma) {
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

  await db.workspaceInvite.update({
    where: { id: inviteId },
    data: { status: 'REVOKED' },
  })

  return { id: inviteId, status: 'REVOKED' }
}

// Accepts an invite: validates the token, re-checks the seat limit
// under an advisory lock (same pattern as app/api/projects/route.js),
// creates the WorkspaceMember with the invite's role, marks the invite
// ACCEPTED, and switches the user's activeWorkspaceId to this
// workspace.
//
// Direct mapping to app/api/projects/route.js, so you can compare them
// side by side:
//   projects route                              this function
//   -----------------------------------------------------------------------
//   requireWorkspaceMembership → gets workspaceId | look up invite by token → gets workspaceId
//   prisma.$transaction(async (tx) => {...})      | same
//   tx.$executeRaw`pg_advisory_xact_lock(hashtext(workspaceId))` | identical call, same key
//   assertWithinLimit(workspaceId, 'maxProjects', tx)            | assertWithinLimit(workspaceId, 'maxWorkspaceMembers', tx)
//   throw LimitExceededError(check.reason)                        | same
//   tx.project.create({ ... })                                    | tx.workspaceMember.create({ ... })
//
// LAYERING NOTE: the projects route writes this transaction directly
// inline in the route file; this function owns it internally instead,
// because your changelog put acceptInvite in lib/invites.js. Concrete
// effect of that difference: this function does NOT take a `db` param
// the way lib/workspace.js functions do — it can't be handed an outer
// `tx` and composed into someone else's transaction, because Prisma
// doesn't support nesting one interactive transaction inside another.
// It always opens and owns its own transaction.
//
// This matters for the invite-signup flow (Q1): "create the new user +
// their personal workspace" and "accept the invite" end up as TWO
// separate, sequential transactions, not one combined one. That's
// fine — if accepting the invite fails right after signup succeeds,
// the user still has a fully working account with their own workspace.
// A recoverable state, not a half-broken one.
export async function acceptInvite(token, userId) {
  // Cheap, unlocked read first. No point opening a transaction and
  // taking a workspace-wide lock for a token that doesn't even exist.
  const precheck = await prisma.workspaceInvite.findUnique({ where: { token } })
  if (!precheck) {
    throw new NotFoundError('This invite link is invalid.')
  }

  const workspaceId = precheck.workspaceId

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${workspaceId}))`

    // Re-fetch through the SAME locked connection — the invite could
    // have been revoked, or accepted by someone else, in the gap
    // between the read above and getting this lock. This is the exact
    // same reasoning as the projects route re-reading the project
    // count through `tx` instead of trusting an earlier read.
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

    const alreadyMember = await tx.workspaceMember.findFirst({
      where: { userId, workspaceId },
    })
    if (alreadyMember) {
      throw new ForbiddenError('You are already a member of this workspace.')
    }

    // THE authoritative seat-limit check. The invite-CREATION-time
    // check (in the future POST /api/workspace/invites route) is only
    // a fail-fast UX nicety — it happens without a lock, so it can't
    // actually stop the race your changelog described (several invites
    // sent while under the limit, then all accepted later). This check
    // is the one that really enforces it, because it runs under the
    // lock, immediately before the insert.
    const seatCheck = await assertWithinLimit(workspaceId, 'maxWorkspaceMembers', tx)
    if (!seatCheck.allowed) {
      throw new LimitExceededError(seatCheck.reason)
    }

    await tx.workspaceMember.create({
      data: {
        userId,
        workspaceId,
        // From the invite — NEVER omitted. Leaving this out would fall
        // through to WorkspaceMember.role's schema default, which is
        // OWNER (see the trap flagged when we designed the schema).
        role: invite.role,
      },
    })

    await tx.workspaceInvite.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED' },
    })

    // Switch the user onto this workspace — see the FLAG comment in
    // createWorkspaceForUser (lib/workspace.js): if this call happened
    // right after a fresh signup, this line is what makes sure they
    // land on the workspace they were actually invited to, not the
    // empty personal one that was just created for them.
    await tx.user.update({
      where: { id: userId },
      data: { activeWorkspaceId: workspaceId },
    })

    return { workspaceId, role: invite.role }
  })
}