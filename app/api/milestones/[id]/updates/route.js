// app/api/milestones/[id]/updates/route.js
// Responsibility: Accept a POST request from the freelancer to add
// a progress note (and optional file) to a specific milestone.
// Why FormData and not JSON?
// Because JSON cannot carry binary file data. FormData is the standard
// multipart format that handles both text fields and file blobs together.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import cloudinary from '@/lib/cloudinary'

export async function POST(request, { params }) {
  try {
    // ── 1. Auth check ──────────────────────────────────────────────────────
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: milestoneId } = await params

    // ── 2. Ownership check ─────────────────────────────────────────────────
    // We fetch the milestone and include just enough of the project to
    // verify the logged-in user owns it. This is one DB query, not two.
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { project: { select: { userId: true } } }
    })

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    if (milestone.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // ── 3. Parse FormData ──────────────────────────────────────────────────
    const formData = await request.formData()
    const note = formData.get('note')         // required text
    const file = formData.get('file')         // optional File object (can be null)

    if (!note?.trim()) {
      return NextResponse.json({ error: 'Note is required' }, { status: 400 })
    }

    // ── 4. Upload to Cloudinary if file was attached ───────────────────────
    // file.size === 0 means the input was submitted empty — treat as no file
    let fileUrl  = null
    let fileName = null
    let fileType = null
    let fileSize = null

    if (file && file.size > 0) {
      // Convert Web API File → base64 data URI (what Cloudinary SDK expects)
      const arrayBuffer = await file.arrayBuffer()
      const base64      = Buffer.from(arrayBuffer).toString('base64')
      const dataUri     = `data:${file.type};base64,${base64}`

      const result = await cloudinary.uploader.upload(dataUri, {
        folder:        `freeport/milestones/${milestoneId}`,
        resource_type: 'auto',   // auto-detects image, pdf, video etc.
        public_id:     `${Date.now()}-${file.name.replace(/\s+/g, '-')}`,
      })

      fileUrl  = result.secure_url
      fileName = file.name
      fileType = file.type
      fileSize = result.bytes
    }

    // ── 5. Save to DB ──────────────────────────────────────────────────────
    const milestoneUpdate = await prisma.milestoneUpdate.create({
      data: {
        note:     note.trim(),
        fileUrl,
        fileName,
        fileType,
        fileSize,
        milestoneId,
      }
    })

    return NextResponse.json(milestoneUpdate, { status: 201 })

  } catch (error) {
    console.error('[MilestoneUpdate POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}