import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import NewProjectModal from '@/components/NewProjectModal'
import ProjectCard from '@/components/ProjectCard'
import { Briefcase, AlertCircle } from 'lucide-react'

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
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const totalProjects = projects.length
  const activeProjects = projects.filter((project) => project.status === 'ACTIVE').length

  const projectsNeedingAttention = projects.filter((project) =>
    project.milestones?.some((milestone) => milestone.status === 'IN_REVIEW')
  )

  const attentionCount = projectsNeedingAttention.length
  const firstName = session.user.name?.split(' ')[0] ?? 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  let subtitle
  if (totalProjects === 0) {
    subtitle = "Let's get your first project set up."
  } else if (attentionCount > 0) {
    subtitle = `${attentionCount} project${attentionCount > 1 ? 's' : ''} waiting on client review.`
  } else if (activeProjects > 0) {
    subtitle = `${activeProjects} active project${activeProjects > 1 ? 's' : ''} in progress`
  } else {
    subtitle = 'All projects completed. Well done.'
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg">
        <div className="relative p-4">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full  px-1 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-fp-text-secondary">
                Dashboard overview
              </div>

              <div className="space-y-3">
                <h1 className="font-sans text-3xl font-medium leading-tight text-fp-text-primary sm:text-4xl lg:text-5xl">
                  {greeting}, <span className="text-fp-accent">{firstName}</span>
                </h1>
                <p className="max-w-xl text-sm leading-relaxed text-fp-text-secondary sm:text-base">
                  {subtitle}
                </p>
              </div>
            </div>
          </div>

          {attentionCount > 0 && (
            <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-fp-warning/20 bg-fp-warning/10 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fp-warning/15 text-fp-warning">
                  <AlertCircle className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug text-fp-text-primary">
                    {attentionCount === 1
                      ? `"${projectsNeedingAttention[0].name}" has a milestone waiting for client approval.`
                      : `${attentionCount} projects have milestones waiting for client approval.`}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-fp-text-secondary">
                    Keep approvals moving so delivery stays on schedule.
                  </p>
                </div>
              </div>

              <div className="sm:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-fp-text-tertiary">
                  Needs attention
                </p>
                <p className="mt-1 text-sm font-medium text-fp-warning tabular-nums">
                  {attentionCount} open
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex gap-2 flex-row items-end justify-between">
          <div className="pl-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.28em] text-fp-text-secondary">
              Your Projects
            </h2>
          </div>

          <div className="shrink-0">
            <NewProjectModal userId={session.user.id} />
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-fp-border bg-fp-surface/70 px-6 py-16 text-center sm:px-10">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-fp-border bg-fp-base/70">
              <Briefcase className="h-5 w-5 text-fp-text-tertiary" />
            </div>
            <p className="text-sm font-medium text-fp-text-primary">
              Start your first project
            </p>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-fp-text-tertiary">
              Add a project and invite your client. They&apos;ll get a private portal with their own link.
            </p>
            <div className="mt-6 flex justify-center">
              <NewProjectModal userId={session.user.id} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}