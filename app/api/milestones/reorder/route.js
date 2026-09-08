// app/api/milestones/reorder/route.js
// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/milestones/reorder
//
// Called after the freelancer drags milestones into a new order.
// Receives an ordered array of milestone IDs. Updates each milestone's
// `order` field to match its new position (index 0, 1, 2...).
//
// Why PATCH and not PUT?
// PUT implies replacing the entire resource. PATCH means "partial update".
// We're only changing the `order` field, so PATCH is correct.
//
// Why one route for all milestones instead of PATCHing each individually?
// If we PATCHed one by one, the client would make N separate API calls after
// each drag (slow, wasteful, risk of partial failure). One batch call is atomic.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import prisma from '@/lib/prisma'
import { requireProjectMembership } from '@/lib/project'
import { can } from '@/lib/project-permissions'
import { ForbiddenError } from '@/lib/errors'
import { handleApiError } from '@/lib/http-errors'

export async function PATCH(request) {
  try {
    // Step 1 — Auth check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Step 2 — Read body
    // orderedIds = array of milestone IDs in the new order the freelancer wants
    // Example: ["clx1", "clx3", "clx2"] means clx1 is now first, clx3 second, etc.
    const { orderedIds } = await request.json()

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: 'orderedIds must be a non-empty array' }, { status: 400 })
    }

    // Step 3 — Project check
    // Reordering is a per-project action. Look up which project every
    // milestone in the list actually belongs to.
    //
    // If the count doesn't match orderedIds.length, at least one ID
    // doesn't exist at all — 404, not a permission question.
    //
    // If the milestones span MORE THAN ONE project, reject with 400.
    // Project-scoped role checking needs exactly one project to check
    // the caller's role against — silently picking one and applying it
    // to the others would be a real hole (someone staffed as PM on
    // project A could smuggle a milestone ID from project B, where
    // they're only a Contributor, into the same batch).
    const milestones = await prisma.milestone.findMany({
      where: { id: { in: orderedIds } },
      select: { id: true, projectId: true },
    })

    if (milestones.length !== orderedIds.length) {
      return NextResponse.json({ error: 'One or more milestones not found' }, { status: 404 })
    }

    const projectIds = [...new Set(milestones.map((m) => m.projectId))]
    if (projectIds.length > 1) {
      return NextResponse.json(
        { error: 'All milestones in a single reorder must belong to the same project' },
        { status: 400 }
      )
    }
    const [projectId] = projectIds

    // CHANGED: was requireProjectRole(membership.role, ['PROJECT_MANAGER']).
    // Same fix as every other milestone route — reordering is part of
    // 'manageMilestones' in the matrix (Owner/Admin and PM, not
    // Contributor). The raw 'PROJECT_MANAGER' string check was
    // silently broken for implicit Owner/Admin access the moment
    // requireProjectMembership stopped hardcoding that role string —
    // this was one of the exact call sites that grep was for.
    const membership = await requireProjectMembership(session.user.id, projectId)
    if (!can(membership.role, 'manageMilestones')) {
      throw new ForbiddenError('You do not have permission to reorder milestones on this project.')
    }

    // Step 4 — Batch update
    // prisma.$transaction runs all updates together as one atomic database operation.
    // If any single update fails, ALL of them are rolled back — no partial state.
    // We assign order = index (0-based) to match the position in orderedIds.
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.milestone.update({
          where: { id },
          data:  { order: index },
        })
      )
    )

    return NextResponse.json({ success: true })

  } catch (error) {
    return handleApiError(error)
  }
}