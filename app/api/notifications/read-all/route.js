// app/api/notifications/read-all/route.js
//
// POST /api/notifications/read-all
//
// Marks every UNREAD notification for this user, IN THEIR CURRENTLY
// ACTIVE WORKSPACE, as read. Scoped to the active workspace only — this
// must never mark read a notification that belongs to a DIFFERENT
// workspace the same user also happens to be a member of. Same boundary
// the GET route enforces, kept consistent on purpose.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWorkspaceForUser } from '@/lib/workspace.js'
import { markAllNotificationsAsRead } from '@/lib/notifications/service.js'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const membership = await getWorkspaceForUser(session.user.id)
  if (!membership) {
    return NextResponse.json({ updatedCount: 0 })
  }

  const result = await markAllNotificationsAsRead(session.user.id, membership.workspaceId)
  return NextResponse.json(result)
}