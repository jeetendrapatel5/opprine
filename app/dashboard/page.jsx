import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import { requireWorkspaceMembership } from '@/lib/workspace'
import NewProjectModal from '@/components/NewProjectModal'
import ProjectCard from '@/components/ProjectCard'
import { Briefcase, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'


export const dynamic = 'force-dynamic'

// One line in the attention panel: a project that has at least one milestone
// in review. The whole row is a link to that project's page.
function AttentionRow({ project }) {
  const inReview = (project.milestones ?? []).filter(
    (milestone) => milestone.status === 'IN_REVIEW'
  )
  const [first, ...rest] = inReview

  return (
    <li>
      <Link
        href={`/dashboard/projects/${project.id}`}
        className="group/row flex items-center gap-3 px-4 py-3 transition-colors hover:bg-fp-raised focus-visible:bg-fp-raised focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-fp-accent"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-fp-text-primary">
            {project.name}
          </p>
          <p className="mt-0.5 flex items-baseline gap-1 text-xs text-fp-text-secondary">
            <span className="truncate">{first?.title ?? 'Untitled milestone'}</span>
            {rest.length > 0 && (
              <span className="shrink-0 tabular-nums">+{rest.length} more</span>
            )}
          </p>
        </div>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-fp-text-tertiary transition-colors group-hover/row:text-fp-text-secondary"
          aria-hidden="true"
        />
      </Link>
    </li>
  )
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/signin')

  const membership = await requireWorkspaceMembership(session.user.id)

  const projects = await prisma.project.findMany({
    where: { workspaceId: membership.workspaceId },
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
        </div>
      </section>

      {attentionCount > 0 && (
        <details className="group/panel overflow-hidden rounded-2xl border border-fp-border bg-fp-surface">
          <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-3 px-4 py-2 transition-colors hover:bg-fp-raised focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-fp-accent [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-2.5">
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-fp-warning"
                aria-hidden="true"
              />
              <span className="min-w-0 flex gap-2 items-center">
                <span className="block text-sm font-medium leading-5 text-fp-text-primary">
                  Waiting on client approval
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-fp-text-secondary">
                  Follow up to keep delivery on schedule.
                </span>
              </span>
            </span>

            <span className="flex shrink-0 items-center gap-2">
              <span className="rounded-full bg-fp-warning/15 px-2 py-0.5 text-xs font-medium tabular-nums text-fp-warning">
                {attentionCount}
                <span className="sr-only"> pending</span>
              </span>
              <ChevronDown
                className="h-4 w-4 text-fp-text-secondary transition-transform group-open/panel:rotate-180"
                aria-hidden="true"
              />
            </span>
          </summary>

          <ul className="divide-y divide-fp-border border-t border-fp-border animate-in fade-in slide-in-from-top-1 duration-200 motion-reduce:animate-none">
            {projectsNeedingAttention.map((project) => (
              <AttentionRow key={project.id} project={project} />
            ))}
          </ul>
        </details>
      )}

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