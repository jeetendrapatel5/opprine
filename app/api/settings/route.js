// app/api/settings/route.js
//
// PATCH — update the logged-in freelancer's profile fields.
//
// Handles two content types:
//   multipart/form-data — when an avatar file is included
//   application/json    — when only text fields are being updated
//
// Security: session-based. Only the logged-in user can update their own profile.

import { NextResponse }  from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions }   from '@/app/api/auth/[...nextauth]/route'
import prisma            from '@/lib/prisma'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contentType = request.headers.get('content-type') ?? ''
    const isMultipart = contentType.includes('multipart/form-data')

    let updateData = {}

    if (isMultipart) {
      // ── Avatar upload path ─────────────────────────────────────────────
      const formData = await request.formData()

      const name         = formData.get('name')
      const bio          = formData.get('bio')
      const portfolioUrl = formData.get('portfolioUrl')
      const file         = formData.get('avatar')

      if (name         !== null) updateData.name         = name
      if (bio          !== null) updateData.bio          = bio
      if (portfolioUrl !== null) updateData.portfolioUrl = portfolioUrl

      if (file && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer()
        const base64      = Buffer.from(arrayBuffer).toString('base64')
        const dataUri     = `data:${file.type};base64,${base64}`

        const result = await cloudinary.uploader.upload(dataUri, {
          folder:         'freeport/avatars',
          resource_type:  'image',
          // transformation: crop to square, 400x400 — consistent avatar size
          transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
          public_id:      `avatar-${session.user.id}`,
          // overwrite: true replaces the existing avatar instead of creating a new file
          overwrite:      true,
        })

        updateData.avatarUrl = result.secure_url
      }

    } else {
      // ── JSON path — text fields only ────────────────────────────────────
      const body = await request.json()
      const { name, bio, portfolioUrl } = body

      if (name         !== undefined) updateData.name         = name
      if (bio          !== undefined) updateData.bio          = bio
      if (portfolioUrl !== undefined) updateData.portfolioUrl = portfolioUrl
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data:  updateData,
      // Only return safe fields — never return the password hash
      select: {
        id:          true,
        name:        true,
        email:       true,
        bio:         true,
        avatarUrl:   true,
        portfolioUrl: true,
      },
    })

    return NextResponse.json(updated)

  } catch (error) {
    console.error('[PATCH /api/settings]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// GET — fetch the current user's profile for the settings page
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where:  { id: session.user.id },
      select: {
        id:           true,
        name:         true,
        email:        true,
        bio:          true,
        avatarUrl:    true,
        portfolioUrl: true,
      },
    })

    return NextResponse.json(user)

  } catch (error) {
    console.error('[GET /api/settings]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}