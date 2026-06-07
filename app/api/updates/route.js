// app/api/updates/route.js

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import prisma from '@/lib/prisma'

export async function POST(request) {
  try {
    // Step 1 — Check user is logged in
    const session = await getServerSession(authOptions)
    if (!session) {
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

    // Step 4 — Verify this project belongs to the logged-in user
    // Never skip this check — always verify ownership
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        userId: session.user.id  // must belong to this user
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Step 5 — Create the update
    const update = await prisma.update.create({
      data: {
        text,
        status: status || 'IN_PROGRESS',
        projectId
      }
    })

    return NextResponse.json(update, { status: 201 })

  } catch (error) {
    console.error('Create update error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
