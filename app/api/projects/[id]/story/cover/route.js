// app/api/projects/[id]/story/cover/route.js
//
// POST — uploads a cover image to Cloudinary and returns the URL.
//
// Why a separate route instead of making the story PATCH handle multipart:
// The story form has many text fields and they save as JSON. Mixing JSON
// and file upload into one route requires multipart for everything, which
// complicates the save logic. Uploading the image separately and storing
// just the URL keeps both routes clean and simple.
//
// Flow:
//   1. Freelancer picks a file in StoryEditor
//   2. StoryEditor POSTs the file here immediately
//   3. This route uploads to Cloudinary, returns the secure_url
//   4. StoryEditor stores the URL in local state
//   5. When the freelancer saves the form, the URL is sent as a string in JSON

import { NextResponse }     from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import prisma               from '@/lib/prisma'
import cloudinary           from '@/lib/cloudinary'

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Ownership check — confirm this project belongs to the session user
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file     = formData.get('cover')

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }

    // Convert the Web API File object to a base64 data URI.
    // Cloudinary's Node SDK uploader.upload() accepts data URIs directly.
    const arrayBuffer = await file.arrayBuffer()
    const base64      = Buffer.from(arrayBuffer).toString('base64')
    const dataUri     = `data:${file.type};base64,${base64}`

    const result = await cloudinary.uploader.upload(dataUri, {
      folder:         'freeport/covers',
      resource_type:  'image',
      // Crop to 16:9 for a consistent hero image aspect ratio across all stories.
      // gravity: 'auto' uses Cloudinary's content-aware cropping — it finds
      // the most important part of the image (faces, focal points) and keeps it.
      transformation: [
        { width: 1200, height: 675, crop: 'fill', gravity: 'auto' },
      ],
      // public_id includes the project ID so covers are organized by project.
      // If the freelancer uploads a new cover, it overwrites the old one
      // (same public_id) — no orphaned images pile up in Cloudinary.
      public_id:  `cover-${id}`,
      overwrite:  true,
    })

    return NextResponse.json({ url: result.secure_url })

  } catch (error) {
    console.error('[POST /api/projects/[id]/story/cover]', error)
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 })
  }
}