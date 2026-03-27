// app/api/portal/[token]/approve/route.js

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { milestoneApprovedEmail } from '@/lib/emailTemplates'

export async function PATCH(request, { params }) {
  try {
    const { token } = await params
    const { itemId, type, action = 'approve', reason } = await request.json()

    // ── Verify the magic token ────────────────────────────────────────────────
    // This is the client's only form of authentication.
    // We expand the include here to fetch everything the email needs
    // in a single query rather than making extra queries later.
    //
    // What we fetch and why:
    //   client.project.user     — freelancer name + email (the email recipient)
    //   client.project.milestones — ordered list so we can find the next PENDING one
    //   client.project.name     — shown in the email subject and body
    const client = await prisma.client.findUnique({
      where: { magicToken: token },
      include: {
        project: {
          include: {
            // user — the freelancer who owns this project
            user: {
              select: {
                name:  true,
                email: true,
              },
            },
            // milestones ordered by position — needed to find "what's next"
            // after this one gets approved
            milestones: {
              orderBy: { order: 'asc' },
              select: {
                id:     true,
                title:  true,
                status: true,
                order:  true,
              },
            },
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Invalid access token' }, { status: 401 })
    }

    // ── MILESTONE ─────────────────────────────────────────────────────────────
    if (type === 'milestone') {
      const milestoneData = action === 'approve'
        ? {
            status:        'COMPLETED',
            approvedAt:    new Date(),
            completedAt:   new Date(),   // keep in sync with PATCH route
            rejectionNote: null,
          }
        : {
            status:        'IN_PROGRESS',
            approvedAt:    null,
            completedAt:   null,
            rejectionNote: reason ?? null,
          }

      const updated = await prisma.milestone.update({
        where:  { id: itemId, projectId: client.projectId },
        data:   milestoneData,
      })

      // On rejection — save the client message to MilestoneMessage permanently
      if (action === 'reject' && reason?.trim()) {
        await prisma.milestoneMessage.create({
          data: {
            content:     reason.trim(),
            sender:      'CLIENT',
            milestoneId: itemId,
          },
        })
      }

      // ── Send "milestone approved" email to freelancer ─────────────────────
      // Only fires on approval, not rejection.
      // Rejection has its own email (Feature 6.3 extension — optional later).
      if (action === 'approve') {
        const { project } = client
        const freelancer  = project.user

        // Find the milestone that was just approved so we know its title.
        // We look it up from the milestones array we already fetched —
        // no extra query needed.
        const approvedMilestone = project.milestones.find(m => m.id === itemId)

        // Find the next milestone the freelancer should work on.
        // "Next" means: PENDING status, order higher than the approved one,
        // sorted ascending so we get the immediately next one.
        //
        // WHY we check order > approvedMilestone.order:
        // We want the milestone that comes AFTER this one in the sequence,
        // not just any pending milestone. A client might approve milestone 2
        // while milestone 1 is still pending (edge case, but possible).
        const approvedOrder  = approvedMilestone?.order ?? 0
        const nextMilestone  = project.milestones.find(
          m => m.status === 'PENDING' && m.order > approvedOrder
        )

        // Build the URL to the freelancer's project page on the dashboard.
        // This is where the "View Project →" button in the email links to.
        const dashboardUrl = `${process.env.NEXTAUTH_URL}/dashboard/projects/${project.id}`

        if (freelancer?.email) {
          const { subject, html } = milestoneApprovedEmail({
            freelancerName: freelancer.name,
            clientName:     client.name,
            projectName:    project.name,
            milestoneTitle: approvedMilestone?.title ?? 'Milestone',
            // Pass the title string if found, or null if all milestones are done.
            // The template handles null by showing "All milestones complete."
            nextMilestone:  nextMilestone?.title ?? null,
            dashboardUrl,
          })

          // Fire and forget — same pattern as Feature 6.2.
          // A failure here must never affect the approval response.
          sendEmail({ to: freelancer.email, subject, html }).catch((err) => {
            console.error('[Approve route] Failed to send approval email:', err)
          })
        }
      }

      return NextResponse.json(updated)
    }

    // ── UPDATE (project-level update, not milestone) ──────────────────────────
    if (type === 'update') {
      const updateData = action === 'approve'
        ? { status: 'DONE',        approvedAt: new Date() }
        : { status: 'IN_PROGRESS', approvedAt: null       }

      const updated = await prisma.update.update({
        where: { id: itemId, projectId: client.projectId },
        data:  updateData,
      })

      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Invalid item type' }, { status: 400 })

  } catch (error) {
    console.error('[Approve route]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
