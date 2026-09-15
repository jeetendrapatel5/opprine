// app/api/updates/route.js

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import prisma from '@/lib/prisma'
import { requireProjectMembership } from '@/lib/project'
import { handleApiError } from '@/lib/http-errors'
import { notifyProjectUpdatePosted } from '@/lib/notifications/triggers'

export async function POST(request) {
  try {
    // Step 1 — Check user is logged in
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Step 2 — Read request body
    const body = await request.json()
    const { text, status, projectId } = body

    // Step 3 — Validate
    if (!text || !projectId) {
      return NextResponse.json(
        { error: 'Text and projectId are required' },
        { status: 400 }
      )
    }

    // Step 4 — FIXED. This used to be:
    //   prisma.project.findUnique({ where: { id: projectId, userId: session.user.id } })
    // which only matched if the caller was the ONE user recorded as
    // Project.userId — a leftover from before this app had staffing.
    // Every Contributor, every PM who didn't personally create the
    // project, and every Owner/Admin using implicit access all failed
    // that check and got a false "Project not found."
    //
    // requireProjectMembership is the same authorization function every
    // other project-scoped route in this app already uses (see
    // lib/project.js) — it throws NotFoundError if the project doesn't
    // exist at all, ForbiddenError if this user has no ProjectMember row
    // on it AND isn't OWNER/ADMIN of its workspace. handleApiError below
    // turns either into the right HTTP status automatically.
    //
    // No role check beyond membership, on purpose — posting a status
    // update here is the same kind of internal work-logging as posting a
    // MilestoneUpdate note (see app/api/milestones/[id]/updates/route.js):
    // any staffed member can do it, Contributors included.
    await requireProjectMembership(session.user.id, projectId)

    // Step 5 — Create the update
    const update = await prisma.update.create({
      data: {
        text,
        status: status || 'IN_PROGRESS',
        projectId
      }
    })

    // Step 6 — Notify the project's PMs, with the full details.
    // Fire-and-forget with its own .catch(): a notification failing to
    // write must never fail this request — the update itself already
    // saved successfully by this point. `session.user.name` is used
    // as-is for the "who posted this" text, same assumption flagged on
    // the milestone-updates route — swap for a lookup if your session
    // doesn't carry `name`.
    notifyProjectUpdatePosted(update, projectId, session.user.name).catch((err) => {
      console.error('[POST /api/updates] Failed to create notification:', err)
    })

    return NextResponse.json(update, { status: 201 })

  } catch (error) {
    // FIXED — this used to be a hand-rolled console.error + flat 500 for
    // every error, which meant a genuine "you don't have access"
    // (ForbiddenError) or "no such project" (NotFoundError) from
    // requireProjectMembership above was reported to the frontend as a
    // generic 500, same as an actual server bug. handleApiError is what
    // every other route in this app uses to map those error classes to
    // their real HTTP status (404, 403, etc.) instead of flattening
    // everything to 500 — see app/api/milestones/[id]/route.js for the
    // identical pattern.
    return handleApiError(error)
  }
}