// app/api/notifications/[id]/read/route.js
//
// POST /api/notifications/:id/read
//
// Marks ONE notification read. Idempotent — calling this twice on an
// already-read notification is a successful no-op, not an error (see
// markNotificationAsRead in service.js for why).

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { markNotificationAsRead } from '@/lib/notifications/service.js'
import { NotFoundError } from '@/lib/errors.js'

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    // No separate "is this your notification" check needed here —
    // markNotificationAsRead's WHERE clause already only matches rows
    // where userId equals the logged-in user. Someone guessing another
    // user's notification id just matches zero rows, same outcome as
    // "not found."
    const result = await markNotificationAsRead(session.user.id, id)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: 'Notification not found.' }, { status: 404 })
    }
    console.error('POST /api/notifications/[id]/read failed', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}