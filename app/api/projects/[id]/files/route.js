// app/api/projects/[id]/files/route.js
// FLAGGED ASSUMPTION: guessed this path from the client-portal/${projectId}
// Cloudinary folder naming — your uploaded file had no path comment.
// Move this to wherever the route actually lives if I guessed wrong;
// nothing in the content below depends on the path.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import cloudinary from '@/lib/cloudinary'
import prisma from '@/lib/prisma'
import { requireProjectMembership } from '@/lib/project'
import { handleApiError } from '@/lib/http-errors'
import { notifyProjectFileUploaded } from '@/lib/notifications/triggers'

export async function POST(request, { params }) {
  try {
    // 1. Auth check
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Access the projectId from the URL params (Next.js 15 requires awaiting params)
    const { id: projectId } = await params;

    // 3. Read the form data for the file
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // 4. FIXED — identical bug to the one in app/api/updates/route.js:
    // this used to be
    //   prisma.project.findUnique({ where: { id: projectId, userId: session.user.id } })
    // which only matched the ONE user recorded as Project.userId — a
    // leftover from before this app had staffing. Every Contributor,
    // and every PM who didn't personally create the project, got a
    // false "Project not found" and the upload silently failed.
    //
    // requireProjectMembership is the same authorization function every
    // other project-scoped route in this app uses (see lib/project.js).
    // No role check beyond membership — uploading a deliverable is the
    // same class of action as posting a MilestoneUpdate or a project
    // Update: any staffed member can do it, Contributors included. Tell
    // me if you actually want this PM-only instead.
    await requireProjectMembership(session.user.id, projectId)

    // 5. Convert file to base64 for Cloudinary
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const dataUri = `data:${file.type};base64,${base64}`

    // 6. Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: `client-portal/${projectId}`,
      resource_type: 'auto',
      public_id: `${Date.now()}-${file.name.replace(/\s+/g, '-')}`,
    })

    // 7. Save to Database
    const fileRecord = await prisma.file.create({
      data: {
        name: file.name,
        url: uploadResult.secure_url,
        fileType: file.type,
        size: uploadResult.bytes,
        projectId: projectId,
      }
    })

    // 8. NEW — notify the project's PMs. Fire-and-forget with its own
    // .catch(): a notification failing to write must never fail this
    // request — the file itself already saved successfully by this
    // point. `session.user.name` used as-is for the "who uploaded this"
    // text, same assumption flagged on the other two routes.
    notifyProjectFileUploaded(fileRecord, projectId, session.user.name).catch((err) => {
      console.error('[POST file upload] Failed to create notification:', err)
    })

    return NextResponse.json(fileRecord, { status: 201 })

  } catch (error) {
    // FIXED — same reasoning as app/api/updates/route.js: this used to
    // be a hand-rolled console.error + flat 500 for every error, which
    // meant a genuine "you don't have access" (ForbiddenError) from
    // requireProjectMembership above came back indistinguishable from
    // an actual server crash. handleApiError maps it to the real HTTP
    // status instead, matching every other route in this app.
    return handleApiError(error)
  }
}