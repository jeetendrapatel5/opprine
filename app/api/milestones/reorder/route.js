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

    // Step 3 — Ownership check
    // Verify ALL milestones in the list belong to this user.
    // We do this by finding milestones that match both the IDs AND the userId
    // through the project relation. If the count doesn't match orderedIds.length,
    // at least one milestone doesn't belong to this user — reject the whole request.
    const owned = await prisma.milestone.findMany({
      where: {
        id:      { in: orderedIds },
        project: { userId: session.user.id },
      },
      select: { id: true },
    })

    if (owned.length !== orderedIds.length) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
    console.error('Reorder milestones error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}