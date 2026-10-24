// app/api/projects/[id]/requests/route.js
//
//   GET   /api/projects/:id/requests   list requests + the blocked-time ledger
//   POST  /api/projects/:id/requests   create one or more requests (and email the client)
//
// This file is deliberately thin. The real work - permission checks, input
// validation, database queries, email - lives in lib/client-requests.js.
// A route only does three things: check there is a logged-in user, hand the
// request to the lib function, and turn the result (or error) into a response.
//
// POST body:
//   {
//     "milestoneId": "optional milestone id",
//     "notifyClient": true,                     // optional, default true
//     "requests": [
//       { "title": "Brand logo", "type": "TEXT", "instructions": "...",
//         "blocksWork": true, "dueDate": "2026-12-01" }
//     ]
//   }

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleApiError } from '@/lib/http-errors'
import { readJsonBody } from '@/lib/client-request-validation'
import { createClientRequests, listProjectRequests } from '@/lib/client-requests'

export async function GET(_request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    const data = await listProjectRequests({ userId: session.user.id, projectId })
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    const input = await readJsonBody(request)
    const data = await createClientRequests({ userId: session.user.id, projectId, input })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}