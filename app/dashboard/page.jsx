import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import NewProjectModal from '@/components/NewProjectModal'
import StatsCard from '@/components/StatsCard'
import ProjectCard from '@/components/ProjectCard'
import { Briefcase, AlertCircle} from 'lucide-react'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/signin')

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    include: {
      client: true,
      updates: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      milestones: {
        // We only need IN_REVIEW milestones for the attention banner
        where: { status: 'IN_REVIEW' },
        select: { id: true, title: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const totalProjects = projects.length
  const activeProjects = projects.filter(p => p.status === 'ACTIVE').length
  const completedProjects = projects.filter(p => p.status === 'COMPLETED').length

  const projectsNeedingAttention = projects.filter(
    p => p.milestones && p.milestones.length > 0
  )

  const firstName = session.user.name?.split(' ')[0] ?? 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  let subtitle
  if (totalProjects === 0) {
    subtitle = "Let's get your first project set up."
  } else if (projectsNeedingAttention.length > 0) {
    subtitle = `${projectsNeedingAttention.length} project${projectsNeedingAttention.length > 1 ? 's' : ''} waiting on client review.`
  } else if (activeProjects > 0) {
    subtitle = `${activeProjects} active project${activeProjects > 1 ? 's' : ''} in progress.`
  } else {
    subtitle = "All projects completed. Well done."
  }

  return (
    <div>
      <div className="mb-8 pt-2">
        <div className="flex items-end">
          <h1 className="font-sans text-3xl sm:text-4xl font-medium text-fp-text-primary">
            {greeting},{' '}
            <span className="text-fp-accent">{firstName}</span>
          </h1>
        </div>

        <p className="text-fp-text-secondary text-sm mt-2">
          {subtitle}
        </p>
      </div>

      {/* ── Zone 2: Stats row ─────────────────────────────────────────────── */}
      {/* Three cards — total, active, completed. These are the freelancer's
          scoreboard. Seeing numbers (even small ones) triggers the progress
          principle: "I built something real." */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
        <StatsCard
          label="Total Projects"
          value={totalProjects}
          variant="default"
        />
        <StatsCard
          label="Active"
          value={activeProjects}
          variant="success"
        />
        <StatsCard
          label="Completed"
          value={completedProjects}
          variant="complete"
        />
      </div>

      {/* ── Zone 3: Attention banner ───────────────────────────────────────── */}
      {/* Only shown when there are projects with milestones in IN_REVIEW.
          This is the "variable reward" mechanic — something needs you.
          The banner is amber (warning tone) because it needs action,
          but soft amber, not alarm-red. It's an opportunity, not a crisis. */}
      {projectsNeedingAttention.length > 0 && (
        <div className="mb-6 flex items-start gap-3 bg-fp-warning/8 border border-fp-warning/20 rounded-xl px-4 py-3.5">
          <AlertCircle className="w-4 h-4 text-fp-warning mt-0.5 shrink-0" />
          <div>
            <p className="text-fp-warning text-sm font-semibold leading-snug">
              {projectsNeedingAttention.length === 1
                ? `"${projectsNeedingAttention[0].name}" has a milestone waiting for client approval.`
                : `${projectsNeedingAttention.length} projects have milestones waiting for client approval.`
              }
            </p>
            <p className="text-fp-text-secondary text-xs mt-0.5">
              Check the project to see what the client needs to review.
            </p>
          </div>
        </div>
      )}

      {/* ── Zone 4: Projects section ───────────────────────────────────────── */}
      <div>

        {/* Section header — label left, action right */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-fp-text-secondary text-xs font-semibold uppercase tracking-widest">
            Your Projects
          </h2>
          {/* NewProjectModal is a Client Component — handles the form interaction */}
          <NewProjectModal userId={session.user.id} />
        </div>

        {/* Project list — or empty state */}
        {projects.length === 0 ? (

          // Empty state — the first thing a new freelancer sees.
          // This must feel like an INVITATION, not a blank page.
          // "Start your first project" not "No projects found".
          <div className="border border-dashed border-fp-border rounded-xl py-16 flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-fp-surface border border-fp-border flex items-center justify-center mb-4">
              <Briefcase className="w-5 h-5 text-fp-text-tertiary" />
            </div>
            <p className="text-fp-text-primary text-sm font-medium mb-1">
              Start your first project
            </p>
            <p className="text-fp-text-tertiary text-xs mb-6 text-center max-w-[240px]">
              Add a project and invite your client. They'll get a private portal with their own link.
            </p>
            {/* Repeat the primary CTA in the empty state — lower friction */}
            <NewProjectModal userId={session.user.id} />
          </div>

        ) : (

          // Project card list — stacked vertically with a small gap
          // Each card is its own Link (see ProjectCard.jsx)
          <div className="grid grid-cols-2 gap-2">
            {projects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>

        )}
      </div>

    </div>
  )
}