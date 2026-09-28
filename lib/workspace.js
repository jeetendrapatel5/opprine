// lib/workspace.js
//
// Every route that needs "which workspace does this user belong to" or
// "can this user do X in this workspace" calls a function from here —
// never writes its own prisma.workspaceMember query. That's the whole
// point of centralizing this: one place to update, not N routes to
// hunt down.
//
// A user can belong to MULTIPLE workspaces (WorkspaceMember is a join
// table). "Which one is active right now" lives in User.activeWorkspaceId
// — a DB column, not a cookie, because getWorkspaceForUser is also
// called from scripts/backfill-workspaces.mjs, which has no request to
// hold a cookie. See getWorkspaceForUser below for how that column gets
// validated (never trusted blindly) and repaired if it's stale.
//
// About the /** ... */ comments with @param: this file is plain
// JavaScript, so TypeScript files that import it can only learn the
// types from these comments. Without them, TypeScript guesses from the
// default values and guesses wrong (for example it decided that
// createWorkspaceForUser({ name }) was not allowed).

import prisma from './prisma.js'
import { NotFoundError, ForbiddenError } from './errors.js'

// A rule used several times below: NEVER pass a possibly-undefined value
// into a Prisma `where`. `where: { userId: undefined }` does not mean "no
// match" — Prisma treats it as "no filter" and matches EVERYTHING. So every
// id that can come from outside is checked with this before it is used.
/** @param {unknown} value */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

// Returns { workspaceId, role, workspace } for a user, or null if they
// have no workspace at all.
//
// Step-by-step:
//   1. Read activeWorkspaceId off the User row.
//   2. If it's set, confirm a real WorkspaceMember row still backs it up
//      (they could have been removed from that workspace since it was
//      set — a plain scalar column doesn't stop that from happening).
//   3. If step 2 comes back empty — either activeWorkspaceId was never
//      set, or it pointed at a workspace they're no longer in — fall
//      back to whichever workspace they've belonged to the longest
//      (earliest joinedAt). This is deliberately NOT "first workspace
//      alphabetically" or anything else that could shuffle around; the
//      oldest membership is the most stable, predictable default.
//   4. Persist that fallback onto activeWorkspaceId, so the NEXT call
//      to this function goes straight through step 2 instead of
//      recomputing the fallback every single time.
/**
 * @param {string} userId
 * @param {import('./prisma.js').DbClient} [db]
 */
export async function getWorkspaceForUser(userId, db = prisma) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { activeWorkspaceId: true },
  })

  if (user?.activeWorkspaceId) {
    const membership = await db.workspaceMember.findFirst({
      where: { userId, workspaceId: user.activeWorkspaceId },
      include: { workspace: true },
    })
    if (membership) {
      return {
        workspaceId: membership.workspaceId,
        role: membership.role,
        workspace: membership.workspace,
      }
    }
    // Stale/dangling activeWorkspaceId — fall through to step 3 below.
  }

  const fallback = await db.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
    orderBy: { joinedAt: 'asc' },
  })

  if (!fallback) return null // this user genuinely has no workspace

  // Best-effort repair. If this write fails for some reason, we still
  // return the correct membership below — we just don't cache the fix,
  // so the next call recomputes the same fallback again. Not worth
  // failing the whole request over.
  try {
    await db.user.update({
      where: { id: userId },
      data: { activeWorkspaceId: fallback.workspaceId },
    })
  } catch (err) {
    console.error('getWorkspaceForUser: failed to persist fallback activeWorkspaceId', err)
  }

  return {
    workspaceId: fallback.workspaceId,
    role: fallback.role,
    workspace: fallback.workspace,
  }
}

// Same as above, but throws instead of returning null. Use this in
// routes where "no workspace" always means something is broken (a user
// who should have been given one at signup, but wasn't) — so the route
// can just do `const { workspaceId } = await requireWorkspaceMembership(...)`
// without an extra null-check every time.
/**
 * @param {string} userId
 * @param {import('./prisma.js').DbClient} [db]
 */
export async function requireWorkspaceMembership(userId, db = prisma) {
  const membership = await getWorkspaceForUser(userId, db)
  if (!membership) {
    throw new NotFoundError('No workspace found for this user.')
  }
  return membership
}

// Changes which workspace is "active" for a user — e.g. called when
// they pick a different one from a workspace-switcher dropdown.
//
// The only real check needed is membership: does this user actually
// belong to the workspace they're switching to? If yes, they're
// allowed to make it active — there's no separate "does this workspace
// exist" check needed, since a WorkspaceMember row can't exist for a
// workspace that doesn't.
/**
 * @param {string} userId
 * @param {string} workspaceId
 * @param {import('./prisma.js').DbClient} [db]
 */
export async function switchActiveWorkspace(userId, workspaceId, db = prisma) {
  // workspaceId usually comes from a request body. If it isn't a real
  // string, Prisma throws a confusing validation error (a 500). Treat it
  // exactly like "not a member" instead — same message, no information leak.
  if (!isNonEmptyString(userId) || !isNonEmptyString(workspaceId)) {
    throw new ForbiddenError('You are not a member of that workspace.')
  }

  const membership = await db.workspaceMember.findFirst({
    where: { userId, workspaceId },
  })
  if (!membership) {
    throw new ForbiddenError('You are not a member of that workspace.')
  }

  await db.user.update({
    where: { id: userId },
    data: { activeWorkspaceId: workspaceId },
  })

  return { workspaceId, role: membership.role }
}

// Returns EVERY workspace a user belongs to, with their role in each —
// the data a workspace-switcher dropdown needs to render its list.
// Different from getWorkspaceForUser, which only returns ONE workspace
// (whichever is currently active).
/**
 * @param {string} userId
 * @param {import('./prisma.js').DbClient} [db]
 */
export async function listWorkspacesForUser(userId, db = prisma) {
  const [user, memberships] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { activeWorkspaceId: true } }),
    db.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { joinedAt: 'asc' },
    }),
  ])

  return memberships.map((m) => ({
    workspaceId: m.workspaceId,
    name: m.workspace.name,
    role: m.role,
    isActive: m.workspaceId === user?.activeWorkspaceId,
  }))
}

// Throws ForbiddenError if `role` isn't one of `allowedRoles`.
// Example: requireRole(membership.role, ['OWNER'])  // billing actions
//          requireRole(membership.role, ['OWNER', 'ADMIN'])  // invites, later
/**
 * @param {string} role
 * @param {string[]} allowedRoles
 */
export function requireRole(role, allowedRoles) {
  if (!allowedRoles.includes(role)) {
    throw new ForbiddenError(
      `This action requires one of these roles: ${allowedRoles.join(', ')}.`
    )
  }
}

// Creates a Workspace + an OWNER WorkspaceMember row for a user.
//
// This is used in TWO places, deliberately kept as one function instead
// of two copies:
//   1. The signup flow — every brand-new user, going forward.
//   2. scripts/backfill-workspaces.mjs — the one-time migration for
//      users who existed before workspaces did.
// If the definition of "a new workspace" ever changes (e.g. we start
// also creating a default FREE Subscription row right here), there's
// one function to update, not two call sites to keep in sync.
//
// Pass `db` as a transaction client (`tx`) if calling from inside an
// existing transaction — the signup route and the backfill script both
// do this.
/**
 * @param {string} userId
 * @param {{ name?: string, db?: import('./prisma.js').DbClient }} [options]
 */
export async function createWorkspaceForUser(userId, { name, db = prisma } = {}) {
  let workspaceName = name
  if (!workspaceName) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { name: true } })
    workspaceName = `${user?.name ?? 'My'}'s Workspace`
  }

  const workspace = await db.workspace.create({
    data: { name: workspaceName },
  })

  await db.workspaceMember.create({
    data: { userId, workspaceId: workspace.id, role: 'OWNER' },
  })

  // Make this the active workspace. Safe for both current call sites
  // (signup, backfill) because both are always this user's FIRST
  // workspace — there's nothing to accidentally switch away from.
  //
  // Invite-signup flow: a brand-new user who signs up via an invite link
  // gets this personal workspace first, and THEN acceptInvite() runs and
  // overwrites activeWorkspaceId with the invited workspace. Whichever
  // runs second wins, so acceptInvite() must always run second there.
  await db.user.update({
    where: { id: userId },
    data: { activeWorkspaceId: workspace.id },
  })

  return workspace
}

// Relative permission rank — higher number can act on lower. Kept
// local here; no other file currently needs to reason about relative
// role rank.
const ROLE_RANK = { OWNER: 3, ADMIN: 2, MEMBER: 1 }

// Removes a member from a workspace.
//
// Permission rule: the requester must OUTRANK the target — see
// ROLE_RANK above. OWNER can remove ADMIN or MEMBER. ADMIN can remove
// MEMBER only — not a peer ADMIN, not an OWNER. Nobody can remove an
// OWNER through this function, including another OWNER (equal rank is
// blocked, same as unequal-but-lower). That is deliberate, not a gap:
// it means a workspace can never be left without its owner.
//
// Self-removal is explicitly blocked with a clear message — "leaving"
// a workspace is a different feature, not built yet.
/**
 * @param {string} targetUserId
 * @param {string} workspaceId
 * @param {string} requestingUserId
 * @param {import('./prisma.js').DbClient} [db]
 */
export async function removeMember(targetUserId, workspaceId, requestingUserId, db = prisma) {
  // `where: { userId: undefined }` does NOT mean "no match" in Prisma — it
  // means "no filter", so findFirst would return the first member of the
  // workspace, whoever that is. A request that forgot to send targetUserId
  // could then remove a random lower-ranked member. Reject bad ids first.
  if (!isNonEmptyString(targetUserId) || !isNonEmptyString(workspaceId)) {
    throw new NotFoundError('This person is not a member of this workspace.')
  }
  if (!isNonEmptyString(requestingUserId)) {
    throw new ForbiddenError('You are not a member of this workspace.')
  }

  if (targetUserId === requestingUserId) {
    throw new ForbiddenError("You can't remove yourself from a workspace this way.")
  }

  const [requester, target] = await Promise.all([
    db.workspaceMember.findFirst({ where: { userId: requestingUserId, workspaceId } }),
    db.workspaceMember.findFirst({ where: { userId: targetUserId, workspaceId } }),
  ])

  if (!target) {
    throw new NotFoundError('This person is not a member of this workspace.')
  }
  // Shouldn't normally happen — the route calls requireWorkspaceMembership
  // before this — but this function doesn't assume anything about its
  // caller's own validation, so it checks directly too.
  if (!requester) {
    throw new ForbiddenError('You are not a member of this workspace.')
  }

  // FAIL CLOSED. If a role ever shows up that ROLE_RANK doesn't know
  // (say a new VIEWER role is added to the schema and someone forgets to
  // update this file), ROLE_RANK[role] is `undefined`, and
  // `undefined <= 1` is FALSE in JavaScript. The old check would have read
  // that as "allowed" and let the removal through. So: an unknown
  // requester counts as the LOWEST rank (0) and an unknown target counts
  // as the HIGHEST (Infinity). Unknown always means "denied".
  const requesterRank = ROLE_RANK[requester.role] ?? 0
  const targetRank = ROLE_RANK[target.role] ?? Infinity

  if (requesterRank <= targetRank) {
    throw new ForbiddenError('You do not have permission to remove this member.')
  }

  // deleteMany + workspaceId instead of delete-by-id: it can't throw if a
  // second request already removed this row a moment ago, and the extra
  // workspaceId filter guarantees we can only ever delete inside THIS
  // workspace.
  await db.workspaceMember.deleteMany({ where: { id: target.id, workspaceId } })

  // No activeWorkspaceId cleanup needed here. getWorkspaceForUser
  // (above in this file) already re-validates activeWorkspaceId against
  // a real WorkspaceMember row on every read, and self-heals to the
  // next-earliest membership if it's stale. If the removed person's
  // activeWorkspaceId pointed at THIS workspace, that existing fallback
  // logic already handles it next time they load anything.

  return { removed: true, userId: targetUserId, workspaceId }
}

// Lists every member of a workspace, with only the safe user fields
// (never returns password hashes, etc.) — centralized so the "manage
// team" page and any other member-list view use the same shape.
/**
 * @param {string} workspaceId
 * @param {import('./prisma.js').DbClient} [db]
 */
export async function listWorkspaceMembers(workspaceId, db = prisma) {
  // Without this guard, an undefined workspaceId would list the members
  // (names AND emails) of EVERY workspace.
  if (!isNonEmptyString(workspaceId)) {
    throw new NotFoundError('Workspace not found.')
  }

  const members = await db.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: 'asc' },
  })

  return members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    joinedAt: m.joinedAt,
  }))
}