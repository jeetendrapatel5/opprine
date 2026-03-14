import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import PortalHeader from '@/components/portal/PortalHeader'
import UpdateFeed from '@/components/portal/UpdateFeed'
import ProjectMilestones from '@/components/portal/ProjectMilestones'
import FileDeliverables from '@/components/portal/FileDeliverables'
import ProjectSignOff from '../../../components/portal/ProjectSignOff'
import ActionPanel from '@/components/portal/ActionPanel'

export default async function PortalPage({ params }) {
  const { token } = await params
  const client = await prisma.client.findUnique({
    where: { magicToken: token },
    include: {
      project: {
        include: {
          user: { select: { name: true, email: true } },
          updates: { orderBy: { createdAt: 'desc' }, take: 10 },
          files: { orderBy: { createdAt: 'desc' } },
          milestones: {
            orderBy: { order: 'asc' },
            include: {
              milestoneUpdates: { orderBy: { createdAt: 'asc' } },
              messages:         { orderBy: { createdAt: 'asc' } }
            }
          }
        }
      }
    }
  })

  if (!client) notFound()
  const { project } = client

  const actionItems = [
    ...project.milestones.filter(m => m.status === 'IN_REVIEW'),
    ...project.updates.filter(u => u.status === 'IN_REVIEW')
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC]"> {/* Slate-50 background for premium feel */}
      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* ACTION: Surfaces items the client must click to unblock the freelancer */}
        <ActionPanel items={actionItems} token={token} />

        {/* 1. HEADER: The Context */}
        <PortalHeader
          project={project}
          clientName={client.name}
          freelancerName={project.user.name}
        />

        {/* 2. THE MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">

          {/* LEFT: PROGRESS & FEED */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 px-1">
                Project Timeline
              </h2>
              <ProjectMilestones milestones={project.milestones} />
            </section>

            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 px-1">
                Recent Updates
              </h2>
              <UpdateFeed updates={project.updates} />
            </section>
          </div>

          {/* RIGHT: ASSETS & CONTACT */}
          <div className="space-y-8">
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 px-1">
                Shared Deliverables
              </h2>
              <FileDeliverables files={project.files} />
            </section>
            <ProjectSignOff projectId={project.id} freelancerName={project.user.name} existingRating={project.clientRating}
              existingTestimonial={project.testimonial} />

            {/* Support Card */}
            <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
              <h3 className="font-bold text-lg mb-2">Need help?</h3>
              <p className="text-blue-100 text-sm mb-4">
                Have questions about the latest deliverables? Reach out to {project.user.name}.
              </p>
              <a
                href={`mailto:${project.user.email}`}
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