// app/dashboard/projects/[id]/page.jsx

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import {
  ArrowLeft,
  ChevronRight,
  Briefcase,
  Circle,
  CheckCircle2,
  PauseCircle,
  ExternalLink,
  BookOpen,
  Mail,
} from 'lucide-react'

import ProjectTabs from '@/components/project/ProjectTabs'
import MilestoneManager from '@/components/dashboard/milestones'
import ClientReviewCard from '@/components/dashboard/ClientReviewCard'
import CopyButton from '@/components/project/CopyButton'
import GithubConnectPanel from '@/components/GithubConnectPanel'
import ProjectPanelDialog from '@/components/ProjectPanelDialog'
import RecentActivityPanel from '@/components/project/RecentActivityPanel'

//Status config

const STATUS_CONFIG = {
  ACTIVE: {
    label: 'Active',
    className: 'text-fp-success',
    Icon: Circle,
  },
  COMPLETED: {
    label: 'Completed',
    className: 'text-fp-accent',
    Icon: CheckCircle2,
  },
  ON_HOLD: {
    label: 'On Hold',
    className: 'text-fp-warning',
    Icon: PauseCircle,
  },
}

const COMPLETED_MILESTONE_STATUSES = new Set(['COMPLETED', 'APPROVED'])

//helpers 

function timeAgoShort(date) {
  if (!date) return null
  const diffMs = Date.now() - new Date(date).getTime()
  if (Number.isNaN(diffMs)) return null
  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function buildPortalLink(magicToken) {
  const base = process.env.NEXTAUTH_URL
  if (!base || !magicToken) return '#'
  return `${base}/portal/${magicToken}`
}

function getMilestoneProgress(milestones = []) {
  const total = milestones.length
  const completed = milestones.filter((m) =>
    COMPLETED_MILESTONE_STATUSES.has(m?.status),
  ).length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0
  return { completed, total, progress }
}

function SectionHeader({ title, badge, trailing }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <h2 className="text-sm font-semibold text-fp-text-primary">{title}</h2>
        {badge && (
          <span className="text-[10px] font-semibold text-fp-text-tertiary bg-fp-raised border border-fp-border px-2 py-0.5 rounded-full tabular-nums">
            {badge}
          </span>
        )}
      </div>
      {trailing && (
        <div className="flex items-center gap-2">{trailing}</div>
      )}
    </div>
  )
}

function PanelCard({ label, children }) {
  return (
    <div className="bg-fp-surface border border-fp-border rounded-xl overflow-hidden">
      {label && (
        <div className="px-4 py-3 border-b border-fp-border">
          <p className="text-[10px] font-bold text-fp-text-tertiary uppercase tracking-widest">
            {label}
          </p>
        </div>
      )}
      {children}
    </div>
  )
}

export default async function ProjectPage({ params }) {
  const resolvedParams = await params
  const id = resolvedParams?.id
  if (!id) notFound()

  const session = await getServerSession(authOptions)
  if (!session) redirect('/signin')

  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    include: {
      client: true,
      updates: { orderBy: { createdAt: 'desc' } },
      files: { orderBy: { createdAt: 'desc' } },
      milestones: {
        orderBy: { order: 'asc' },
        include: {
          milestoneUpdates: { orderBy: { createdAt: 'asc' } },
          messages: { orderBy: { createdAt: 'asc' } },
          invoices: true,
        },
      },
      invoices: {
        orderBy: { createdAt: 'desc' },
        include: { milestone: { select: { title: true } } },
      },
    },
  })

  if (!project) notFound()

  const portalLink = buildPortalLink(project.client?.magicToken)
  const status = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.ACTIVE
  const StatusIcon = status.Icon
  const { completed, total, progress } = getMilestoneProgress(project.milestones)
  const daysActive = Math.max(
    0,
    Math.floor((Date.now() - new Date(project.createdAt).getTime()) / 86400000),
  )
  const clientViewedText = timeAgoShort(project.client?.lastViewedAt)
  const clientInitial = project.client?.name?.[0]?.toUpperCase() ?? '?'
  const clientName = project.client?.name ?? 'No client assigned'

  const startedLabel = new Date(project.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div className="pb-24">

      {/* ── BREADCRUMB ── */}
      <div className="-mx-4 sm:-mx-6 px-4 sm:px-6 mb-6">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-fp-text-tertiary hover:text-fp-text-secondary transition-colors duration-150"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-fp-border" />
          <span className="flex items-center gap-1.5 text-fp-text-secondary">
            <Briefcase className="w-3.5 h-3.5 text-fp-text-tertiary" />
            {project.name}
          </span>
        </div>
      </div>

      {/* ── PROJECT HEADER ── */}
      <div id="overview" className="scroll-mt-24 mb-6">
        {/* Title row */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-3xl font-semibold text-fp-text-primary tracking-tight leading-tight">
                {project.name}
              </h1>
              <span
                className={`shrink-0 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md ${status.className}`}
              >
                {status.label}
              </span>
            </div>
            {project.description && (
              <p className="text-fp-text-tertiary text-sm mt-1.5 max-w-2xl leading-relaxed">
                {project.description}
              </p>
            )}
          </div>

          {/* Portal quick-actions */}
          <div className="shrink-0 flex items-center gap-2">
            <CopyButton
              value={portalLink}
              label="Copy portal link"
              className="
                h-8 px-3 rounded-lg
                bg-fp-surface border border-fp-border
                text-fp-text-secondary hover:text-fp-text-primary
                hover:border-fp-border/80
              "
            />
            <Link
              href={portalLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open client portal for ${project.name}`}
              className="
                inline-flex items-center gap-1.5
                h-8 px-3 rounded-lg
                bg-fp-accent text-black text-xs font-semibold
                hover:opacity-90 transition-opacity
              "
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open portal
            </Link>
          </div>
        </div>
      </div>

      <div className='top-14 z-20
        -mx-4 sm:-mx-6
        px-4 sm:px-6
        bg-fp-base/[.97] backdrop-blur-sm
        border-b border-fp-border
        mb-8' />

      {/* WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* MAIN CONTENT */}
        <div className="lg:col-span-8 space-y-8">

          {/* Milestones */}
          <section id="milestones" className="scroll-mt-24">
            <SectionHeader
              title="Milestones"
              badge={total > 0 ? `${completed} / ${total}` : undefined}
            />
            <MilestoneManager
              projectId={project.id}
              initialMilestones={project.milestones}
              freelancerName={session.user.name}
              clientName={project.client?.name ?? 'Client'}
            />
          </section>

          {/* Activity & Files */}
          <section id="activity" className="scroll-mt-24">
            <SectionHeader
              title="Activity"
              badge={
                project.updates.length > 0
                  ? `${project.updates.length} update${project.updates.length !== 1 ? 's' : ''}`
                  : undefined
              }
            />

            <div className="bg-fp-surface border border-fp-border rounded-xl overflow-hidden">
              <ProjectTabs project={project} />
            </div>
          </section>

        </div>

        {/* CONTEXT PANEL */}

        <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">

          {/* Client Panel */}
          <PanelCard label="Client">
            <div className="px-4 py-4 space-y-4">

              {/* Identity */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-fp-accent/15 border border-fp-accent/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-fp-accent leading-none">
                    {clientInitial}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fp-text-primary truncate">
                    {clientName}
                  </p>
                  {project.client?.email && (
                    <p className="flex items-center gap-1 text-[11px] text-fp-text-tertiary truncate mt-0.5">
                      <Mail className="w-3 h-3 shrink-0" />
                      {project.client.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Last activity */}
              <div className="flex items-center gap-2.5 px-3 py-2 bg-fp-raised rounded-lg">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${clientViewedText
                    ? 'bg-fp-success ring-2 ring-fp-success/25'
                    : 'bg-fp-border'
                    }`}
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-fp-text-primary">
                    {clientViewedText ? `Last seen ${clientViewedText}` : 'Portal not opened yet'}
                  </p>
                  {clientViewedText && project.client?.lastViewedAt && (
                    <p className="text-[10px] text-fp-text-tertiary">
                      {new Date(project.client.lastViewedAt).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </div>

            </div>
          </PanelCard>

          {/* Project Details Panel ─────────────────────────────────────── */}
          <PanelCard label="Project details">
            <div className="px-4 py-1 divide-y divide-fp-border">

              <DetailRow label="Status">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${status.className}`}
                >
                  <StatusIcon className="w-3 h-3" />
                  {status.label}
                </span>
              </DetailRow>

              <DetailRow label="Started">
                <span className="text-xs font-medium text-fp-text-secondary">
                  {startedLabel}
                </span>
              </DetailRow>

              <DetailRow label="Duration">
                <span className="text-xs font-medium text-fp-text-secondary">
                  {daysActive} days
                </span>
              </DetailRow>

              <DetailRow label="Milestones">
                <div className="flex items-center gap-2">
                  <div className="w-14 h-1.5 bg-fp-raised rounded-full overflow-hidden">
                    <div
                      className="h-full bg-fp-accent rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-fp-accent tabular-nums">
                    {progress}%
                  </span>
                </div>
              </DetailRow>

              <DetailRow label="Updates">
                <span className="text-xs font-medium text-fp-text-secondary tabular-nums">
                  {project.updates.length}
                </span>
              </DetailRow>

              <DetailRow label="Files">
                <span className="text-xs font-medium text-fp-text-secondary tabular-nums">
                  {project.files.length}
                </span>
              </DetailRow>

            </div>
          </PanelCard>

          {/* Actions ───────────────────────────────────────────────────── */}
          <div className="space-y-2">

            {/* Project Story */}
            <Link
              href={`/dashboard/projects/${project.id}/story`}
              className="
                group flex items-center gap-3 w-full
                bg-fp-surface border border-fp-border
                hover:border-fp-accent/30 hover:bg-fp-surface
                rounded-xl px-4 py-3.5 transition-colors duration-150
              "
            >
              <div className="
                w-8 h-8 rounded-lg bg-fp-raised border border-fp-border
                flex items-center justify-center shrink-0
              ">
                <BookOpen className="w-4 h-4 text-fp-text-tertiary group-hover:text-fp-accent transition-colors" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-fp-text-primary group-hover:text-fp-accent transition-colors">
                  Project Story
                </p>
                <p className="text-[11px] text-fp-text-tertiary mt-0.5">
                  {project.caseStudyEnabled
                    ? 'Story is live — view or edit'
                    : 'Turn this project into a case study'}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-fp-text-tertiary group-hover:text-fp-accent transition-colors shrink-0" />
            </Link>

            <ClientReviewCard project={project} />

            {/* Dialogs opened from the sidebar's project panel buttons
                (lib/project-panels.js). Add a new button there, then add a
                matching <ProjectPanelDialog panelId="..."> here — no other
                wiring needed. */}
            <ProjectPanelDialog
              panelId="github"
              title="Connect GitHub repository"
              description="Add a webhook so pushes to this project automatically appear in the client's update feed."
              bare
            >
              <GithubConnectPanel project={project} />
            </ProjectPanelDialog>

            <ProjectPanelDialog
              panelId="activity"
              title="Recent activity"
              description="A quick look at the latest updates on this project."
            >
              <RecentActivityPanel updates={project.updates} />
            </ProjectPanelDialog>

          </div>

        </aside>

      </div>
    </div>
  )
}

// ─── DetailRow — used only inside Project Details Panel ─────────────────────

function DetailRow({ label, children }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-xs text-fp-text-tertiary">{label}</span>
      {children}
    </div>
  )
}