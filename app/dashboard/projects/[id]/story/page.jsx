// app/dashboard/projects/[id]/story/page.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Server Component. Auth-gated. Fetches the project and passes it to
// the StoryEditor client component.
//
// Why we fetch completed milestones here:
// The StoryEditor's live preview shows the milestone timeline.
// The cover image auto-selection logic needs the first completed milestone
// with a delivery image. Fetching this data server-side means StoryEditor
// starts with everything it needs — no loading states for the initial render.
// ─────────────────────────────────────────────────────────────────────────────

import { getServerSession } from 'next-auth'
import { authOptions }      from '@/app/api/auth/[...nextauth]/route'
import { redirect, notFound } from 'next/navigation'
import prisma               from '@/lib/prisma'
import Link                 from 'next/link'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import StoryEditor          from '@/components/dashboard/story/StoryEditor'

export default async function ProjectStoryPage({ params }) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  if (!session) redirect('/signin')

  // Fetch the project with all the data StoryEditor needs.
  // The nested where on userId is our ownership check — if the project
  // doesn't belong to this user, findFirst returns null and we call notFound().
  const project = await prisma.project.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    include: {
      // user — StoryEditor needs username to check if the public profile is set up
      user: {
        select: {
          username:  true,
          name:      true,
        },
      },
      // client — needed for the "hide client" toggle preview
      client: {
        select: { name: true },
      },
      // Only completed milestones — these are the deliverables shown in the story
      milestones: {
        where:   { status: 'COMPLETED' },
        orderBy: { completedAt: 'asc' },
        include: {
          milestoneUpdates: {
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      // Files — used for the deliverables section in the preview
      files: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!project) notFound()

  return (
    <div className="pb-24">

      {/* ── Breadcrumb bar ── */}
      <div className="bg-fp-surface border-b border-fp-border -mx-4 sm:-mx-6 px-4 sm:px-6 mb-8">
        <div className="max-w-7xl mx-auto h-11 flex items-center gap-1.5 text-xs font-medium">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-fp-text-tertiary hover:text-fp-text-secondary transition-colors duration-150"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-fp-border" />
          <Link
            href={`/dashboard/projects/${id}`}
            className="text-fp-text-tertiary hover:text-fp-text-secondary transition-colors duration-150 truncate max-w-[160px]"
          >
            {project.name}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-fp-border" />
          <span className="text-fp-text-secondary">Project Story</span>
        </div>
      </div>

      {/* ── Page header ── */}
      <div className="max-w-7xl mx-auto mb-6">
        <h1 className="font-display text-2xl font-medium text-fp-text-primary tracking-tight">
          Project Story
        </h1>
        <p className="text-fp-text-secondary text-sm mt-1 leading-relaxed">
          Turn this project into a public case study that wins you the next client.
        </p>
      </div>

      {/* ── Story editor — full width ── */}
      <div className="max-w-7xl mx-auto">
        <StoryEditor project={project} />
      </div>

    </div>
  )
}