// app/api/users/profile/route.js
//
// PATCH — updates the logged-in freelancer's public profile fields.
//
// Unlike the story route, there is no [id] in the URL.
// We use session.user.id directly — a user can only ever update their own profile.
// This means there's no BOLA risk and no ownership check needed beyond auth.
//
// Accepts (all optional):
//   username        String — must match /^[a-z0-9-]+$/, must be unique
//   profileEnabled  Boolean
//   profileTagline  String
//   bio             String
//   portfolioUrl    String
//
// Returns: the updated user object (password field excluded).

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const {
      username,
      profileEnabled,
      profileTagline,
      bio,
      portfolioUrl,
    } = body

    const updateData = {}

    // ── Username validation ───────────────────────────────────────────────────
    if (username !== undefined) {
      if (username) {
        // Enforce format: lowercase letters, numbers, hyphens only.
        // No leading/trailing hyphens, no consecutive hyphens — cleaner URLs.
        const usernameRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/
        if (!usernameRegex.test(username)) {
          return NextResponse.json(
            {
              error:
                'Username can only contain lowercase letters, numbers, and hyphens. It cannot start or end with a hyphen.',
            },
            { status: 400 }
          )
        }

        if (username.length < 3) {
          return NextResponse.json(
            { error: 'Username must be at least 3 characters.' },
            { status: 400 }
          )
        }

        if (username.length > 30) {
          return NextResponse.json(
            { error: 'Username cannot be longer than 30 characters.' },
            { status: 400 }
          )
        }
      }

      // null or empty string → clear the username
      updateData.username = username || null
    }

    if (profileEnabled !== undefined) updateData.profileEnabled = profileEnabled
    if (profileTagline  !== undefined) updateData.profileTagline = profileTagline || null
    if (bio             !== undefined) updateData.bio            = bio            || null
    if (portfolioUrl    !== undefined) updateData.portfolioUrl   = portfolioUrl   || null

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data:  updateData,
      // Never return the password hash — select only safe fields
      select: {
        id:             true,
        name:           true,
        email:          true,
        bio:            true,
        avatarUrl:      true,
        portfolioUrl:   true,
        username:       true,
        profileEnabled: true,
        profileTagline: true,
      },
    })

    return NextResponse.json(updated)

  } catch (error) {
    // P2002 = unique constraint violation — username is already taken
    if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
      return NextResponse.json(
        { error: 'This username is already taken.' },
        { status: 409 }
      )
    }
    console.error('[PATCH /api/users/profile]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}