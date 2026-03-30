// app/dashboard/projects/[id]/page.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PSYCHOLOGICAL GOAL: The freelancer opens this page and within 3 seconds
// knows: what state each milestone is in, what needs their attention, and
// what their client last did. Everything else is secondary.
//
// LAYOUT (left-heavy 2-column):
//   Full-width: Breadcrumb navigation bar
//   Full-width: Project title + status badge
//   Left 8/12: MilestoneManager → ProjectTabs (updates, files, invoices)
//   Right 4/12: ProjectSidebar (client info, portal link, activity)
//              ClientReviewCard (testimonial, if project completed)
//
// HIERARCHY:
//   1. Milestones (the workspace — what the freelancer is actively managing)
//   2. Sidebar (client status — the variable reward: "did they view it?")
//   3. Tabs (history and files — reference, not primary)
//
// Server Component — data fetched here, passed down as props.
// ─────────────────────────────────────────────────────────────────────────────

import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect, notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, Briefcase, Circle, CheckCircle2, PauseCircle } from 'lucide-react'

import ProjectSidebar    from '@/components/project/ProjectSidebar'
import ProjectTabs       from '@/components/project/ProjectTabs'
import MilestoneManager  from '@/components/dashboard/milestones'
import ClientReviewCard  from '@/components/dashboard/ClientReviewCard'

// Maps Prisma status enum to a display badge
const statusConfig = {
  ACTIVE:    { label: 'Active',    class: 'bg-fp-success/10 text-fp-success border-fp-success/20',   Icon: Circle       },
  COMPLETED: { label: 'Completed', class: 'bg-fp-accent-muted text-fp-accent border-fp-accent/20',   Icon: CheckCircle2 },
  ON_HOLD:   { label: 'On Hold',   class: 'bg-fp-warning/10 text-fp-warning border-fp-warning/20',   Icon: PauseCircle  },
}

export default async function ProjectPage({ params }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) redirect('/signin')

  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    include: {
      client:  true,
      updates: { orderBy: { createdAt: 'desc' } },
      files:   { orderBy: { createdAt: 'desc' } },
      milestones: {
        orderBy: { order: 'asc' },
        include: {
          milestoneUpdates: { orderBy: { createdAt: 'asc' } },
          messages:         { orderBy: { createdAt: 'asc' } },
          invoices:         true,
        },
      },
      invoices: {
        orderBy: { createdAt: 'desc' },
        include: {
          milestone: { select: { title: true } },
        },
      },
    },
  })

  if (!project) notFound()

  const portalLink = `${process.env.NEXTAUTH_URL}/portal/${project.client?.magicToken}`
  const status     = statusConfig[project.status] ?? statusConfig.ACTIVE
  const StatusIcon = status.Icon

  return (
    // bg-fp-base is set by the dashboard layout — this div just adds bottom padding
    <div className="pb-24">

      {/* ── Breadcrumb bar ─────────────────────────────────────────────────── */}
      {/* Sits below the sticky Navbar. Provides spatial context: where am I? */}
      {/* bg-fp-surface creates a subtle layer above the page base */}
      <div className="bg-fp-surface border-b border-fp-border -mx-4 sm:-mx-6 px-4 sm:px-6 mb-8">
        <div className="max-w-5xl mx-auto h-11 flex items-center gap-1.5 text-xs font-medium">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-fp-text-tertiary hover:text-fp-text-secondary transition-colors duration-150"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-fp-border" />
          <div className="flex items-center gap-1.5 text-fp-text-secondary">
            <Briefcase className="w-3.5 h-3.5 text-fp-text-tertiary" />
            {project.name}
          </div>
        </div>
      </div>

      {/* ── Page title ─────────────────────────────────────────────────────── */}
      {/* font-display (Fraunces) — project names are headlines, not labels. */}
      {/* This is the first thing the freelancer sees. It should feel weighty. */}
      <div className="mb-8">
        <div className="flex items-start gap-4 flex-wrap">
          <h1 className="font-display text-3xl font-medium text-fp-text-primary tracking-tight leading-tight flex-1 min-w-0">
            {project.name}
          </h1>
          {/* Status badge — immediately answers "what state is this project in?" */}
          <span className={`
            shrink-0 mt-1 inline-flex items-center gap-1.5
            text-xs font-semibold uppercase tracking-wide
            px-2.5 py-1 rounded border
            ${status.class}
          `}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </span>
        </div>

        {project.description && (
          <p className="text-fp-text-secondary text-sm mt-2 max-w-2xl leading-relaxed">
            {project.description}
          </p>
        )}
      </div>

      {/* ── 2-column workspace grid ────────────────────────────────────────── */}
      {/* Left 2/3: The work (milestones + history tabs)                       */}
      {/* Right 1/3: The context (client info, portal, activity signal)        */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── Left column ── */}
        <div className="lg:col-span-8 space-y-6">
          <MilestoneManager
            projectId={project.id}
            initialMilestones={project.milestones}
            freelancerName={session.user.name}
            clientName={project.client?.name ?? 'Client'}
          />

          {/* Tabs: Updates, Files, Invoices */}
          <div className="bg-fp-surface border border-fp-border rounded-xl overflow-hidden">
            <ProjectTabs project={project} />
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="lg:col-span-4 space-y-4">
          <ProjectSidebar project={project} portalLink={portalLink} />
          <ClientReviewCard project={project} />
        </div>

      </div>
    </div>
  )
}