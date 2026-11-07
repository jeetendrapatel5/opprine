// app/api/projects/[id]/attention/route.js
//
//   GET /api/projects/:id/attention
//
// "Needs Attention" for one project (Project Delivery Pulse): what is stuck
// right now, who has to act, and for how long.
//
// Deliberately thin, like the other project routes: check there is a logged-in
// user, hand over to the lib function, turn the result (or error) into a
// response. Access checks and ALL of the rules live in lib/project-attention.js;
// nothing here (or in the UI) decides what "needs attention" means.
//
// Response:
//   {
//     "items": [
//       { "id", "kind", "title", "nextActionBy": "CLIENT" | "TEAM",
//         "blocking", "overdue", "priority": "HIGH" | "NORMAL",
//         "since", "waitingDays", "dueDate",
//         "entity": { "kind": "clientRequest" | "milestone", "id" },
//         "milestoneId" }
//     ],
//     "summary": { "total", "high", "blocking", "overdue",
//                  "waitingOnClient", "waitingOnTeam", "oldestBlockingSince" },
//     "truncated": false,
//     "generatedAt": "..."
//   }
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleApiError } from '@/lib/http-errors'
import { getProjectAttention } from '@/lib/project-attention'

export async function GET(_request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    const data = await getProjectAttention({ userId: session.user.id, projectId })
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error)
  }
}