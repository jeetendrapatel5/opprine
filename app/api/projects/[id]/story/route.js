// app/api/projects/[id]/story/route.js
//
// PATCH — saves the Project Story / case study fields for a project.
//
// Security: atomic ownership check — one Prisma query that verifies
// both the project exists AND belongs to session.user.id.
//
// Accepts (all optional — only fields present in the body are updated):
//   caseStudyEnabled    Boolean
//   caseStudyProblem    String
//   caseStudyOutcome    String
//   caseStudyTechStack  String[]
//   caseStudyHideClient Boolean
//   caseStudyCoverImage String (Cloudinary URL)
//   caseStudyIndustry   String
//   publicSlug          String
//
// Returns: the updated project object with all case study fields.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body   = await request.json()

    // Destructure only the fields this route is allowed to update.
    // We never let this route touch unrelated fields like status, clientId, etc.
    const {
      caseStudyEnabled,
      caseStudyProblem,
      caseStudyOutcome,
      caseStudyTechStack,
      caseStudyHideClient,
      caseStudyCoverImage,
      caseStudyIndustry,
      publicSlug,
    } = body

    // Build the update object — only include fields that were actually sent.
    // "undefined" means the key was absent from the request body.
    // We skip it so a partial save (e.g. just toggling caseStudyEnabled)
    // never accidentally overwrites the narrative text with undefined.
    const updateData = {}

    if (caseStudyEnabled    !== undefined) updateData.caseStudyEnabled    = caseStudyEnabled
    if (caseStudyProblem    !== undefined) updateData.caseStudyProblem    = caseStudyProblem
    if (caseStudyOutcome    !== undefined) updateData.caseStudyOutcome    = caseStudyOutcome
    if (caseStudyTechStack  !== undefined) updateData.caseStudyTechStack  = caseStudyTechStack
    if (caseStudyHideClient !== undefined) updateData.caseStudyHideClient = caseStudyHideClient
    if (caseStudyCoverImage !== undefined) updateData.caseStudyCoverImage = caseStudyCoverImage
    if (caseStudyIndustry   !== undefined) updateData.caseStudyIndustry   = caseStudyIndustry

    // publicSlug — validate format before saving.
    // Must be lowercase letters, numbers, and hyphens only.
    // No spaces, no special characters, no uppercase.
    // e.g. "acme-website-redesign" is valid, "Acme Website!" is not.
    if (publicSlug !== undefined) {
      const slugRegex = /^[a-z0-9-]+$/
      if (publicSlug && !slugRegex.test(publicSlug)) {
        return NextResponse.json(
          { error: 'Slug can only contain lowercase letters, numbers, and hyphens.' },
          { status: 400 }
        )
      }
      updateData.publicSlug = publicSlug || null
    }

    // ── Atomic ownership check + update ──────────────────────────────────────
    // findFirst with nested where checks both the project ID and the user ID
    // in one database query. If either doesn't match, we get null.
    // We then use a separate update — this is intentional: findFirst confirms
    // ownership, update performs the write. They're on the same record so
    // there's no race condition risk in this single-tenant context.
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // publicSlug must be unique. If another project already has this slug,
    // Prisma will throw a unique constraint error. We catch it specifically.
    const updated = await prisma.project.update({
      where: { id },
      data:  updateData,
    })

    return NextResponse.json(updated)

  } catch (error) {
    // P2002 is Prisma's unique constraint violation error code.
    // This fires if another project already has the publicSlug value.
    if (error.code === 'P2002' && error.meta?.target?.includes('publicSlug')) {
      return NextResponse.json(
        { error: 'This URL slug is already taken. Please choose a different one.' },
        { status: 409 }
      )
    }
    console.error('[PATCH /api/projects/[id]/story]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}