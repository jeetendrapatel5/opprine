// app/dashboard/projects/[id]/page.jsx

import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
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
  BookOpen,
} from 'lucide-react'

import ProjectSidebar from '@/components/project/ProjectSidebar'
import ProjectTabs from '@/components/project/ProjectTabs'
import MilestoneManager from '@/components/dashboard/milestones'
import ClientReviewCard from '@/components/dashboard/ClientReviewCard'

const statusConfig = {
  ACTIVE: {
    label: 'Active',
    class: 'bg-fp-success/10 text-fp-success',
    Icon: Circle,
  },
  COMPLETED: {
    label: 'Completed',
    class: 'bg-fp-accent-muted text-fp-accent',
    Icon: CheckCircle2,
  },
  ON_HOLD: {
    label: 'On Hold',
    class: 'bg-fp-warning/10 text-fp-warning',
    Icon: PauseCircle,
  },
}

const COMPLETED_MILESTONE_STATUSES = new Set(['COMPLETED', 'APPROVED'])
const ACTIVE_INVOICE_STATUSES = new Set(['UNPAID'])

function timeAgoShort(date) {
  if (!date) return null

  const diffMs = Date.now() - new Date(date).getTime()
  if (Number.isNaN(diffMs)) return null

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function buildPortalLink(magicToken) {
  const baseUrl = process.env.NEXTAUTH_URL
  if (!baseUrl || !magicToken) return '#'
  return `${baseUrl}/portal/${magicToken}`
}

function getMilestoneProgress(milestones = []) {
  const total = milestones.length
  const completed = milestones.filter((milestone) =>
    COMPLETED_MILESTONE_STATUSES.has(milestone?.status)
  ).length

  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  return {
    completed,
    total,
    progress,
  }
}

function getActiveInvoices(invoices = []) {
  return invoices.filter((invoice) =>
    ACTIVE_INVOICE_STATUSES.has(invoice?.status)
  )
}

export default async function ProjectPage({ params }) {
  const resolvedParams = await params
  const id = resolvedParams?.id

  if (!id) notFound()

  const session = await getServerSession(authOptions)
  if (!session) redirect('/signin')

  const project = await prisma.project.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
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
  const status = statusConfig[project.status] ?? statusConfig.ACTIVE
  const StatusIcon = status.Icon

  const { completed, total, progress } = getMilestoneProgress(project.milestones)
  const activeInvoices = getActiveInvoices(project.invoices)
  const activeInvoicesCount = activeInvoices.length
  const daysActive = Math.max(
    0,
    Math.floor((Date.now() - new Date(project.createdAt).getTime()) / 86400000)
  )
  const clientViewedText = timeAgoShort(project.client?.lastViewedAt)

  return (
    <div className="pb-24">
      {/* Breadcrumb */}
      <div className="-mx-4 sm:-mx-6 px-4 sm:px-6 mb-8">
        <div className="max-w-7xl mx-auto flex items-center gap-1.5 text-xs font-medium">
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

      {/* Title + badge */}
      <div className="mb-5">
        <div className="flex items-start gap-4 flex-wrap">
          <h1 className="font-[poppins] text-3xl font-medium text-fp-text-primary tracking-tight leading-tight flex-1 min-w-0">
            {project.name}
          </h1>
          <span
            className={`shrink-0 mt-1 inline-flex items-center bg-transparent gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md ${status.class}`}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            {status.label}
          </span>
        </div>
        {project.description && (
          <p className="text-fp-text-secondary text-sm mt-1.5 max-w-2xl leading-relaxed">
            {project.description}
          </p>
        )}
      </div>

      {/* ── STATS STRIP ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 rounded-xl overflow-hidden mb-8">
        {/* Progress */}
        <div className="bg-fp-surface px-4 py-3.5 space-y-1.5 rounded-xl">
          <p className="text-[10px] font-bold text-fp-text-tertiary uppercase tracking-widest">
            Progress
          </p>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold text-fp-text-primary tabular-nums leading-none">
              {completed}
              <span className="text-fp-text-tertiary font-normal text-sm">
                /{total}
              </span>
            </span>
            <span className="text-xs font-bold text-fp-accent tabular-nums">
              {progress}%
            </span>
          </div>
          <div className="h-1 bg-fp-raised rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-fp-text-tertiary">
            milestones approved
          </p>
        </div>

        {/* Timeline */}
        <div className="bg-fp-surface px-4 py-3.5 space-y-1.5 rounded-xl">
          <p className="text-[10px] font-bold text-fp-text-tertiary uppercase tracking-widest">
            Timeline
          </p>
          <p className="text-xl font-bold text-fp-text-primary tabular-nums leading-none">
            {daysActive}
            <span className="text-sm font-normal text-fp-text-tertiary">
              {' '}
              days
            </span>
          </p>
          <p className="text-[10px] text-fp-text-tertiary">
            started{' '}
            {new Date(project.createdAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>

        {/* Client activity */}
        <div className="bg-fp-surface px-4 py-3.5 space-y-1.5 rounded-xl">
          <p className="text-[10px] font-bold text-fp-text-tertiary uppercase tracking-widest">
            Client
          </p>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${clientViewedText
                  ? 'bg-fp-success ring-2 ring-fp-success/20'
                  : 'bg-fp-border'
                }`}
            />
            <p className="text-base font-bold text-fp-text-primary leading-none tabular-nums">
              {clientViewedText ?? 'Not opened'}
            </p>
          </div>
          <p className="text-[10px] text-fp-text-tertiary">
            {clientViewedText
              ? `last portal view · ${new Date(
                project.client.lastViewedAt
              ).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              })}`
              : 'share the magic link below'}
          </p>
        </div>

        {/* Invoices */}
        <div className="bg-fp-surface px-4 py-3.5 space-y-1.5 rounded-xl">
          <p className="text-[10px] font-bold text-fp-text-tertiary uppercase tracking-widest">
            Invoices
          </p>
          {activeInvoicesCount > 0 ? (
            <p className="text-xl font-bold text-fp-warning tabular-nums leading-none">
              {activeInvoicesCount}
              <span className="text-sm font-normal text-fp-text-tertiary">
                {' '}
                active
              </span>
            </p>
          ) : (
            <p className="text-normal font-bold text-fp-text-primary leading-none">
              No Active Invoices
            </p>
          )}
          <p className="text-[10px] text-fp-text-tertiary">
            {activeInvoices.length} Active Invoice
            {activeInvoices.length !== 1 ? 's' : ''} Total
          </p>
        </div>
      </div>

      {/* 2-column workspace grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          <MilestoneManager
            projectId={project.id}
            initialMilestones={project.milestones}
            freelancerName={session.user.name}
            clientName={project.client?.name ?? 'Client'}
          />
          <div className="bg-fp-surface rounded-xl overflow-hidden">
            <ProjectTabs project={project} />
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <ProjectSidebar project={project} portalLink={portalLink} />
          <Link
            href={`/dashboard/projects/${project.id}/story`}
            className="
    flex items-center gap-2 w-full
    bg-fp-surface hover:border-fp-border rounded-xl px-4 py-3
    text-fp-text-secondary text-sm font-medium
    hover:border-fp-accent/30 hover:text-fp-accent
    transition-colors duration-150
  "
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <div>
              <p className="font-semibold">Project Story</p>
              <p className="text-fp-text-tertiary text-xs">
                {project.caseStudyEnabled ? 'Story is live' : 'Turn this project into a case study'}
              </p>
            </div>
          </Link>
          <ClientReviewCard project={project} />
        </div>

      </div>
    </div>
  )
}