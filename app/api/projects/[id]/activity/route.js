// app/api/projects/[id]/activity/route.js
//
//   GET /api/projects/:id/activity?limit=20&cursor=<opaque>
//
// The project timeline for TEAM members (Project Delivery Pulse).
//
// Like the other project routes this file is deliberately thin: check there is
// a logged-in user, hand the request to the lib function, turn the result (or
// error) into a response. Project access, role checks, validation and the
// database query all live in lib/project-activity-feed.js.
//
// Response (lastSeenAt = when the CURRENT user last opened the panel, or null):
//   {
//     "items": [
//       { "id", "type", "title", "occurredAt", "visibility",
//         "actor":  { "type", "userId", "name" },
//         "entity": { "kind", "id" },
//         "metadata": { ... } | null }
//     ],
//     "nextCursor": "<opaque string>" | null,    // pass back as ?cursor= for older events
//     "lastSeenAt": "<ISO time>" | null
//   }
//
// There is no client/portal version of this route on purpose.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleApiError } from '@/lib/http-errors'
import { listProjectActivity } from '@/lib/project-activity-feed'

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    const search = new URL(request.url).searchParams

    const data = await listProjectActivity({
      userId: session.user.id,
      projectId,
      // Raw and untrusted: validated inside the lib function.
      query: {
        limit: search.get('limit') ?? undefined,
        cursor: search.get('cursor') ?? undefined,
      },
    })
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error)
  }
}