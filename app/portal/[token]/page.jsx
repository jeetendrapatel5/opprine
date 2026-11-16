// app/portal/[token]/page.jsx
// Client-facing project portal, opened with a per-client magic-link token (no
// login). This Server Component loads the data; layout and presentation live in
// components/portal/PortalView.jsx. Interactive pieces (approvals, requests,
// sign-off, file preview) are Client Components further down.

import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getProjectProgress } from '@/lib/projectProgress'
import { listProjectMembersForPortal } from '@/lib/project'
import { listPortalRequests, markRequestsViewed } from '@/lib/client-requests'
import PortalView from '@/components/portal/PortalView'

export default async function PortalPage({ params }) {
  const { token } = await params

  const client = await prisma.client.findUnique({
    where: { magicToken: token },
    include: {
      project: {
        include: {
          // Only name and email are shown to the client.
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          updates: { orderBy: { createdAt: 'desc' }, take: 10 },
          files: { orderBy: { createdAt: 'desc' } },
          milestones: {
            orderBy: { order: 'asc' },
            include: {
              milestoneUpdates: { orderBy: { createdAt: 'asc' } },
              messages: { orderBy: { createdAt: 'asc' } },
            },
          },
          invoices: {
            orderBy: { createdAt: 'desc' },
            include: {
              milestone: { select: { title: true } },
            },
          },
        },
      },
    },
  })

  if (!client) notFound()

  // Fire-and-forget: record when the client opened the portal. The catch keeps
  // a failure from becoming an unhandled rejection.
  prisma.client
    .update({
      where: { magicToken: token },
      data: { lastViewedAt: new Date() },
    })
    .catch(() => {})

  const { project } = client

  // Everyone staffed on this project, shaped for client eyes (no email, no
  // workspace role). Scoped to the project resolved from the valid token, so
  // it can never surface another project's people.
  const teamMembers = await listProjectMembersForPortal(project.id)

  // `include` returns every scalar on Milestone, so strip createdByUserId once
  // here: otherwise it would travel to the browser inside the milestone props.
  // (Relations such as tasks are never loaded because they are not in `include`.)
  const milestones = project.milestones.map(({ createdByUserId, ...milestone }) => milestone)

  const progress = getProjectProgress(milestones)

  // Client requests (lib/client-requests.js decides what the client may see).
  // A failure here, for example a migration not applied yet, must never take
  // the whole portal down: the page just renders without the requests card.
  // markRequestsViewed is awaited, not fire-and-forget, so serverless hosts
  // can't cut it off; its own failure is only logged.
  let requestData = {
    requests: [],
    blocked: { blockedDays: 0, openBlockingCount: 0, oldestOpenSince: null },
  }
  try {
    const [data] = await Promise.all([
      listPortalRequests(token),
      markRequestsViewed(token).catch((err) => console.error('[portal] markRequestsViewed failed:', err)),
    ])
    requestData = data
  } catch (err) {
    console.error('[portal] Could not load client requests:', err)
  }

  // Update-level items waiting on approval (legacy Update model).
  // Milestone approvals live inside the timeline's DeliveryCard.
  const actionItems = project.updates.filter((u) => u.status === 'IN_REVIEW')

  return (
    <PortalView
      token={token}
      client={client}
      project={project}
      milestones={milestones}
      progress={progress}
      teamMembers={teamMembers}
      requestData={requestData}
      actionItems={actionItems}
    />
  )
}
