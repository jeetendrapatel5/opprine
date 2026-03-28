// app/portal/[token]/page.jsx

import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import PortalHeader        from '@/components/portal/PortalHeader'
import UpdateFeed          from '@/components/portal/UpdateFeed'
import ProjectMilestones   from '@/components/portal/ProjectMilestones'
import FileDeliverables    from '@/components/portal/FileDeliverables'
import ProjectSignOff      from '@/components/portal/ProjectSignOff'
import ActionPanel         from '@/components/portal/ActionPanel'
import ProgressBanner      from '@/components/portal/ProgressBanner'
import CurrentlyWorkingOn  from '@/components/portal/CurrentlyWorkingOn'
import InvoicePanel        from '@/components/portal/InvoicePanel'
import { getProjectProgress } from '@/lib/projectProgress'

export default async function PortalPage({ params }) {
  const { token } = await params

  const client = await prisma.client.findUnique({
    where: { magicToken: token },
    include: {
      project: {
        include: {
          user:    { select: { name: true, email: true } },
          updates: { orderBy: { createdAt: 'desc' }, take: 10 },
          files:   { orderBy: { createdAt: 'desc' } },
          milestones: {
            orderBy: { order: 'asc' },
            include: {
              milestoneUpdates: { orderBy: { createdAt: 'asc' } },
              messages:         { orderBy: { createdAt: 'asc' } },
            },
          },
          // Invoices — ordered newest first.
          // We include the milestone title so InvoicePanel can show
          // "For: Homepage Design" without an extra query.
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

  // Fire-and-forget — log when client opens the portal
  prisma.client.update({
    where: { magicToken: token },
    data:  { lastViewedAt: new Date() },
  }).catch(() => {})

  const { project } = client
  const progress    = getProjectProgress(project.milestones)

  // ActionPanel only handles project-level updates, not milestones.
  // Milestone approvals are handled by DeliveryCard inside ProjectMilestones.
  const actionItems = project.updates.filter(u => u.status === 'IN_REVIEW')

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* Progress banner */}
        <ProgressBanner
          progress={progress}
          projectName={project.name}
          milestones={project.milestones}
        />

        {/* "Currently working on" — only when ON_TRACK and something is IN_PROGRESS */}
        {progress.projectStatus === 'ON_TRACK' && progress.currentMilestone && (
          <CurrentlyWorkingOn milestone={progress.currentMilestone} />
        )}

        {/* Action panel — update-level approvals */}
        <ActionPanel items={actionItems} token={token} />

        {/* Portal header — project name, client name, freelancer name */}
        <PortalHeader
          project={project}
          clientName={client.name}
          freelancerName={project.user.name}
        />

        {/* Main 3-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">

          {/* LEFT — Timeline + Updates */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 px-1">
                Project Timeline
              </h2>
              <ProjectMilestones
                milestones={project.milestones}
                freelancerName={project.user.name}
                clientName={client.name}
                token={token}
              />
            </section>

            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 px-1">
                Recent Updates
              </h2>
              <UpdateFeed updates={project.updates} />
            </section>
          </div>

          {/* RIGHT — Invoices, Files, Sign-off, Support */}
          <div className="space-y-8">

            {/* Invoices — shown first because payment is time-sensitive */}
            {/* InvoicePanel renders nothing if there are no visible invoices */}
            <InvoicePanel invoices={project.invoices} />

            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 px-1">
                Shared Deliverables
              </h2>
              <FileDeliverables files={project.files} />
            </section>

            <ProjectSignOff
              projectId={project.id}
              freelancerName={project.user.name}
              existingRating={project.clientRating}
              existingTestimonial={project.testimonial}
            />

            {/* Support card */}
            <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
              <h3 className="font-bold text-lg mb-2">Need help?</h3>
              <p className="text-blue-100 text-sm mb-4">
                Have questions about the latest deliverables? Reach out to {project.user.name}.
              </p>
              
              <a href={`mailto:${project.user.email}`}
                className="block text-center bg-white text-blue-600 py-2 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors"
              >
                Send Message
              </a>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}