// app/api/projects/[id]/requests/[requestId]/route.js
//
//   PATCH /api/projects/:id/requests/:requestId
//
// The request lives UNDER its project in the URL on purpose: the project id
// is the one the permission check is run against, and the lib function also
// requires the request to belong to that project - so a request id from some
// other project simply returns 404.
//
// Body (one of):
//   { "action": "accept" }                       client's answer is fine
//   { "action": "cancel" }                       withdraw the request
//   { "action": "update", "title": "...",        edit; only while still OPEN.
//     "instructions": "..." | null,              Missing field = leave alone,
//     "dueDate": "2026-12-01" | null }           null = clear it.
//
// Wrong-state attempts (e.g. accepting a request that is still open) return
// 409 with a readable message.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleApiError } from '@/lib/http-errors'
import { readJsonBody } from '@/lib/client-request-validation'
import { updateClientRequest } from '@/lib/client-requests'

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId, requestId } = await params
    const input = await readJsonBody(request)
    const updated = await updateClientRequest({
      userId: session.user.id,
      projectId,
      requestId,
      input,
    })
    return NextResponse.json(updated)
  } catch (error) {
    return handleApiError(error)
  }
}