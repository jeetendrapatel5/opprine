// app/api/settings/route.js
import { NextResponse }  from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
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
    let usernameToCheck = null  

    if (isMultipart) {
      const formData = await request.formData()

      const name           = formData.get('name')
      const bio            = formData.get('bio')
      const portfolioUrl   = formData.get('portfolioUrl')
      const file           = formData.get('avatar')

      // NEW — three more fields read the exact same way as the existing ones.
      const username       = formData.get('username')
      const profileTagline = formData.get('profileTagline')
      const profileEnabled = formData.get('profileEnabled')

      if (name         !== null) updateData.name         = name
      if (bio          !== null) updateData.bio          = bio
      if (portfolioUrl !== null) updateData.portfolioUrl = portfolioUrl

      // NEW block — same "only if present" pattern as the lines above it.
      if (username !== null) {
        updateData.username = username || null
        usernameToCheck = username || null
      }
      if (profileTagline !== null) updateData.profileTagline = profileTagline || null
      // FormData only stores STRINGS, never real booleans — a checkbox comes
      // through as the text "true" or "false", not the boolean true/false.
      // We must convert it manually, or Prisma will save the literal string
      // "false" into a Boolean column and crash.
      if (profileEnabled !== null) updateData.profileEnabled = profileEnabled === 'true'

      if (file && file.size > 0) {
        // ...unchanged, your existing Cloudinary upload code stays exactly as-is...
        const arrayBuffer = await file.arrayBuffer()
        const base64      = Buffer.from(arrayBuffer).toString('base64')
        const dataUri     = `data:${file.type};base64,${base64}`

        const result = await cloudinary.uploader.upload(dataUri, {
          folder:         'freeport/avatars',
          resource_type:  'image',
          transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
          public_id:      `avatar-${session.user.id}`,
          overwrite:      true,
        })

        updateData.avatarUrl = result.secure_url
      }

    } else {
      const body = await request.json()
      // NEW — three more destructured fields, same line as before.
      const { name, bio, portfolioUrl, username, profileTagline, profileEnabled } = body

      if (name         !== undefined) updateData.name         = name
      if (bio          !== undefined) updateData.bio          = bio
      if (portfolioUrl !== undefined) updateData.portfolioUrl = portfolioUrl

      // NEW block — JSON gives us REAL booleans already, so no string
      // conversion needed here, unlike the multipart branch above.
      if (username !== undefined) {
        updateData.username = username || null
        usernameToCheck = username || null
      }
      if (profileTagline !== undefined) updateData.profileTagline = profileTagline || null
      if (profileEnabled !== undefined) updateData.profileEnabled = profileEnabled
    }

    // NEW — the uniqueness check, runs ONCE regardless of which path was
    // taken above, right before we touch the database.
    // Why AFTER both branches instead of inside each one: it avoids
    // writing this same check twice (once per branch) — one copy, always run.
    if (usernameToCheck) {
      const validFormat = /^[a-z0-9-]+$/.test(usernameToCheck)
      if (!validFormat) {
        return NextResponse.json(
          { error: 'Username can only contain lowercase letters, numbers, and hyphens' },
          { status: 400 }
        )
      }
      const existing = await prisma.user.findFirst({
        where: { username: usernameToCheck, NOT: { id: session.user.id } },
      })
      if (existing) {
        return NextResponse.json({ error: 'That username is already taken' }, { status: 409 })
      }
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data:  updateData,
      select: {
        id: true, name: true, email: true, bio: true, avatarUrl: true,
        portfolioUrl: true,
        // NEW — return the new fields too, so the frontend sees the saved result.
        username: true, profileTagline: true, profileEnabled: true,
      },
    })

    return NextResponse.json(updated)

  } catch (error) {
    console.error('[PATCH /api/settings]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// GET — same edit: add the three new fields to `select`
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where:  { id: session.user.id },
      select: {
        id: true, name: true, email: true, bio: true, avatarUrl: true,
        portfolioUrl: true,
        username: true, profileTagline: true, profileEnabled: true,  // NEW
      },
    })

    return NextResponse.json(user)

  } catch (error) {
    console.error('[GET /api/settings]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}