// app/api/notifications/route.js
//
// GET /api/notifications?cursor=xxx&limit=20
//
// Returns the CURRENT user's notifications, scoped to their CURRENTLY
// ACTIVE workspace — never all workspaces they belong to at once. That
// scoping is what makes cross-workspace leaking structurally impossible
// here, not just "checked" — the query in service.js physically cannot
// return a row from a different workspace, because workspaceId is part
// of its WHERE clause, not a filter applied afterward.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWorkspaceForUser } from '@/lib/workspace.js'
import { getNotificationsForUser, getUnreadNotificationCount } from '@/lib/notifications/service.js'

export async function GET(request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Resolve "which workspace" the exact same way every other
  // workspace-scoped page in this app already does — this route does
  // not invent its own idea of "current workspace."
  const membership = await getWorkspaceForUser(session.user.id)
  if (!membership) {
    // No workspace at all (shouldn't happen post-signup) — an empty,
    // valid response rather than an error, since "no notifications" is
    // a perfectly normal state to render.
    return NextResponse.json({ notifications: [], unreadCount: 0, nextCursor: null })
  }

  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor') || undefined
  const requestedLimit = Number(searchParams.get('limit'))
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 20

  // The count and the page are independent reads — neither needs the
  // other's result — so they run in parallel instead of one after
  // another. Both hit the same composite index on Notification.
  const [unreadCount, page] = await Promise.all([
    getUnreadNotificationCount(session.user.id, membership.workspaceId),
    getNotificationsForUser(session.user.id, membership.workspaceId, { cursor, limit }),
  ])

  return NextResponse.json({
    notifications: page.notifications,
    unreadCount,
    nextCursor: page.nextCursor,
  })
}