// app/api/portal/[token]/approve/route.js

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PATCH(request, { params }) {
  try {
    const { token } = await params
    const { itemId, type, action = 'approve', reason } = await request.json()

    // Verify the magic token — this is the client's auth
    const client = await prisma.client.findUnique({
      where: { magicToken: token },
      include: { project: true }
    })

    if (!client) {
      return NextResponse.json({ error: 'Invalid access token' }, { status: 401 })
    }

    // ── MILESTONE ────────────────────────────────────────────────────────────
    if (type === 'milestone') {
      const milestoneData = action === 'approve'
        ? {
            status:       'COMPLETED',
            approvedAt:   new Date(),
            rejectionNote: null,  // clear the red-dot indicator on approval
          }
        : {
            status:       'IN_PROGRESS',
            approvedAt:   null,
            rejectionNote: reason ?? null,  // update quick-access field
          }

      // Update the milestone status
      const updated = await prisma.milestone.update({
        where: { id: itemId, projectId: client.projectId },
        data: milestoneData,
      })

      // ── KEY CHANGE ───────────────────────────────────────────────────────
      // On rejection, permanently save the message to MilestoneMessage.
      // This record is NEVER overwritten — every rejection gets its own row.
      // That is why history is now preserved across multiple review cycles.
      if (action === 'reject' && reason?.trim()) {
        await prisma.milestoneMessage.create({
          data: {
            content:    reason.trim(),
            sender:     'CLIENT',
            milestoneId: itemId,
          }
        })
      }
      // ─────────────────────────────────────────────────────────────────────

      return NextResponse.json(updated)
    }

    // ── UPDATE (project-level update, not milestone) ─────────────────────────
    if (type === 'update') {
      const updateData = action === 'approve'
        ? { status: 'DONE',        approvedAt: new Date() }
        : { status: 'IN_PROGRESS', approvedAt: null }

      const updated = await prisma.update.update({
        where: { id: itemId, projectId: client.projectId },
        data: updateData,
      })

      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Invalid item type' }, { status: 400 })

  } catch (error) {
    console.error('[Approve route]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}