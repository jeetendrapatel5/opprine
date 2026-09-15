// lib/notifications/service.js
//
// Every read or write against the Notification table goes through a
// function in THIS file — same rule lib/workspace.js and lib/project.js
// already enforce for their own tables. Routes and components call these
// functions; they never write `prisma.notification.findMany(...)`
// themselves. That's what makes "never leak across workspaces" a fact
// about the CODE (one place to get right) instead of a hope about every
// route author remembering to filter correctly.

import prisma from '../prisma.js'
import { NotFoundError, ForbiddenError } from '../errors.js'
import { requireProjectMembership } from '../project.js'

// Creates ONE notification, with authorization and dedup both handled
// here — not left to the caller.
//
// Step-by-step:
//   1. Confirm the recipient is actually a member of `workspaceId`. If
//      they're not (already removed, or this was never valid), we don't
//      throw — we just silently skip. A notification failing to be
//      created should NEVER fail the business action that triggered it
//      (e.g. a milestone submission must succeed even if one of the
//      three people who should be told about it left the workspace five
//      minutes ago).
//   2. If this notification is ABOUT a project (projectId is set),
//      confirm the recipient can actually access that project — reusing
//      requireProjectMembership() from lib/project.js, the exact same
//      function every project route already calls. This is the literal
//      mechanism behind the spec's "never assume a user can access every
//      project" rule.
//   3. Try to insert. If a row with the same (userId, dedupeKey) already
//      exists, Postgres rejects the insert (unique constraint) — we
//      catch that ONE specific error code and return the existing row
//      instead of throwing, which is what makes this function safe to
//      call twice for the same event.
export async function createNotification(
  { userId, workspaceId, type, title, message, projectId = null, metadata = null, dedupeKey = null },
  db = prisma
) {
  const workspaceMembership = await db.workspaceMember.findFirst({
    where: { userId, workspaceId },
  })
  if (!workspaceMembership) {
    return null
  }

  if (projectId) {
    try {
      await requireProjectMembership(userId, projectId, db)
    } catch (err) {
      // ForbiddenError = not staffed and not an implicit OWNER/ADMIN.
      // NotFoundError = the project itself is gone. Either way: this
      // recipient shouldn't get this notification, and that's not an
      // error worth surfacing to whatever route called us.
      if (err instanceof ForbiddenError || err instanceof NotFoundError) {
        return null
      }
      throw err
    }
  }

  try {
    return await db.notification.create({
      data: { userId, workspaceId, type, title, message, projectId, metadata, dedupeKey },
    })
  } catch (err) {
    // Prisma's error code for "unique constraint violated." This is the
    // @@unique([userId, dedupeKey]) constraint on the Notification model
    // firing — meaning this exact event was already notified about.
    // Not a failure: return the row that already represents it.
    if (err.code === 'P2002') {
      return db.notification.findFirst({ where: { userId, dedupeKey } })
    }
    throw err
  }
}

// Bulk version — same guarantees as createNotification, just for the
// common case of "notify a LIST of people about one event" (e.g. every
// Project Manager on a project). Runs the individual creates in
// parallel and drops any that returned null (skipped for authorization
// or genuinely failed) rather than making one bad recipient fail the
// whole batch.
export async function createNotifications(paramsList, db = prisma) {
  const results = await Promise.all(paramsList.map((params) => createNotification(params, db)))
  return results.filter(Boolean)
}

// Fetches ONE page of notifications for a user, scoped to ONE workspace.
// Cursor-based, not offset-based — offset pagination (`skip: 200`) gets
// slower as the table grows because Postgres still has to walk past the
// 200 skipped rows; cursor pagination ("give me everything after this
// specific row") stays fast at any table size because it's a direct
// index seek.
//
// `limit` is hard-capped at 50 regardless of what's requested — this is
// what stops a client from asking for the entire notification history
// in one request, per the spec's "do not return an unlimited list" rule.
export async function getNotificationsForUser(userId, workspaceId, { cursor, limit = 20 } = {}, db = prisma) {
  const take = Math.min(limit, 50)

  const rows = await db.notification.findMany({
    where: { userId, workspaceId },
    // Ordering by TWO fields, not just createdAt, because createdAt
    // alone isn't guaranteed unique (two notifications created in the
    // same millisecond would tie) — `id` as a tiebreaker makes the
    // ordering, and therefore the cursor, deterministic.
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    // Fetch ONE extra row past what we're going to return. If we get
    // `take + 1` rows back, we know there's a next page — without
    // running a separate, more expensive COUNT query just to answer
    // "is there more."
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      read: true,
      readAt: true,
      projectId: true,
      metadata: true,
      createdAt: true,
      // Deliberately NOT selecting userId/workspaceId/dedupeKey here —
      // the client already knows who it's asking for, and dedupeKey is
      // purely an internal database concern with no reason to ever
      // leave this file.
    },
  })

  const hasMore = rows.length > take
  const page = hasMore ? rows.slice(0, take) : rows

  return {
    notifications: page,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  }
}

// The number shown on the bell's badge. A separate, cheap COUNT query
// rather than deriving it from getNotificationsForUser's page — the
// badge needs the TRUE total unread count across the whole table, not
// just how many unread rows happen to be in the first 20 loaded.
export async function getUnreadNotificationCount(userId, workspaceId, db = prisma) {
  return db.notification.count({ where: { userId, workspaceId, read: false } })
}

// Marks ONE notification read. Idempotent: calling this on an
// already-read notification, or one that doesn't exist for this user,
// never throws — "already read" and "mark as read" both just mean
// "end up read," so there's nothing to treat as an error in either case.
//
// The WHERE clause below does double duty: it's both the update filter
// AND the authorization check. A user literally cannot mark someone
// else's notification read, because a row with a mismatched userId just
// doesn't match the WHERE clause — there's no separate "is this yours"
// check needed above this, the same way removeMember() in workspace.js
// doesn't need one because a WorkspaceMember row can't exist without a
// real workspaceId behind it.
export async function markNotificationAsRead(userId, notificationId, db = prisma) {
  const result = await db.notification.updateMany({
    where: { id: notificationId, userId, read: false },
    data: { read: true, readAt: new Date() },
  })

  if (result.count === 0) {
    // Zero rows updated means one of three things: doesn't exist, isn't
    // this user's, or was already read. Only the first two are worth
    // distinguishing — we check ownership directly to tell "not found /
    // not yours" apart from "already read, nothing to do."
    const existing = await db.notification.findFirst({ where: { id: notificationId, userId } })
    if (!existing) {
      throw new NotFoundError('Notification not found.')
    }
    // else: it existed and belonged to this user, it was just already
    // read — fall through as a success, same end state either way.
  }

  return { id: notificationId, read: true }
}

// Marks EVERY unread notification for this user, IN THIS WORKSPACE,
// read. The workspaceId filter is what stops "mark all as read" in
// Workspace A from silently also marking read something that belongs to
// Workspace B — same boundary every other function in this file
// enforces.
export async function markAllNotificationsAsRead(userId, workspaceId, db = prisma) {
  const result = await db.notification.updateMany({
    where: { userId, workspaceId, read: false },
    data: { read: true, readAt: new Date() },
  })
  return { updatedCount: result.count }
}