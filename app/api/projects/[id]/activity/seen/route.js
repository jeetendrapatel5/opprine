// app/api/projects/[id]/activity/seen/route.js
//
//   POST /api/projects/:id/activity/seen        body (optional): { "through": "<ISO time>" }
//
// "I have looked at the Project activity panel." Moves THIS user's "last seen"
// marker forward (see markProjectActivitySeen). Thin like the other routes:
// session check, hand over to the lib function, turn errors into responses.
//
// Response: { "lastSeenAt": "<ISO time>" }
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleApiError } from '@/lib/http-errors'
import { markProjectActivitySeen } from '@/lib/project-activity-feed'

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    // An empty or invalid body just means "now".
    const body = await request.json().catch(() => ({}))

    const data = await markProjectActivitySeen({ userId: session.user.id, projectId, body })
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error)
  }
}