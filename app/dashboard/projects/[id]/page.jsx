// app/dashboard/projects/[id]/page.jsx

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { requireProjectMembership } from '@/lib/project'
import { requireWorkspaceMembership } from '@/lib/workspace'
import { can } from '@/lib/project-permissions'
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
  Lock,
} from 'lucide-react'

import ProjectTabs from '@/components/project/ProjectTabs'
import MilestoneManager from '@/components/dashboard/milestones'
import ClientReviewCard from '@/components/dashboard/ClientReviewCard'
import CopyButton from '@/components/project/CopyButton'
import GithubConnectPanel from '@/components/GithubConnectPanel'
import ProjectPanelDialog from '@/components/ProjectPanelDialog'
import RecentActivityPanel from '@/components/project/RecentActivityPanel'
import ProjectMembersPanel from '@/components/ProjectMembersPanel'

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

// NEW — a small reusable stand-in for panel content the current
// viewer isn't allowed to see. Used in place of "No client assigned"
// style fallbacks, which would be a LIE for a Contributor: the data
// exists, they just don't have the role for it. Saying so plainly is
// both more honest and less confusing than an empty-looking panel.
function RestrictedNotice({ text }) {
  return (
    <div className="flex items-center gap-2 px-4 py-4 text-xs text-fp-text-tertiary">
      <Lock className="w-3.5 h-3.5 shrink-0" />
      {text}
    </div>
  )
}

export default async function ProjectPage({ params }) {
  const resolvedParams = await params
  const id = resolvedParams?.id
  if (!id) notFound()

  const session = await getServerSession(authOptions)
  if (!session) redirect('/signin')

  // CHANGED — THE CORE FIX. This used to be requireWorkspaceMembership
  // followed by prisma.project.findFirst({ where: { id, workspaceId } }).
  // That checks "is this person in the workspace," which is NOT the
  // same question as "is this person staffed on THIS project." Every
  // other route in this codebase (milestones, staffing) already draws
  // that distinction — this page was the one place that didn't, which
  // meant project-level staffing provided ZERO protection here: any
  // workspace member could open any project's full detail page,
  // client info and all, regardless of whether they were staffed on
  // it.
  //
  // requireProjectMembership throws NotFoundError if the project
  // doesn't exist, ForbiddenError if this user has no ProjectMember
  // row on it and isn't OWNER/ADMIN of its workspace (implicit
  // access). Both map to notFound() below — deliberately not
  // distinguishing "doesn't exist" from "you can't see it" in what
  // the URL reveals, same reasoning most apps use for BOLA prevention:
  // a 404 tells a curious teammate nothing about whether a project ID
  // they don't have access to even exists.
  let membership
  try {
    membership = await requireProjectMembership(session.user.id, id)
  } catch (err) {
    if (err.name === 'NotFoundError' || err.name === 'ForbiddenError') {
      notFound()
    }
    throw err
  }

  // NEW — active-workspace guard. requireProjectMembership above answers
  // "is this user allowed to open this project at all" — it checks real
  // staffing on the PROJECT itself, or OWNER/ADMIN of the project's OWN
  // workspace. It deliberately does NOT check which workspace the user
  // currently has selected in the UI, because access someone was granted
  // shouldn't disappear just because they clicked a different workspace
  // in a dropdown.
  //
  // That's correct for authorization, but it means switching the active
  // workspace does not, by itself, stop this page from rendering a
  // project that belongs to a DIFFERENT workspace — e.g. someone who
  // owns both Workspace A and Workspace B can still open a Workspace-A
  // project after switching to B. This check catches exactly that case:
  // it runs AFTER authorization, never grants anything, and only
  // decides whether THIS page, right now, is the right place to show
  // this project. Covers direct links, page refreshes, and a second
  // browser tab — none of which go through the workspace switcher's
  // own client-side redirect.
  //
  // Kept as a light, separate query (workspaceId only) rather than
  // folding into requireProjectMembership, so the project's client and
  // invoice data is never fetched at all when the workspace doesn't
  // match — satisfies "don't fetch the previous workspace's project"
  // literally, not just "don't display it."
  const activeWorkspace = await requireWorkspaceMembership(session.user.id)
  const projectWorkspace = await prisma.project.findUnique({
    where: { id },
    select: { workspaceId: true },
  })
  if (projectWorkspace?.workspaceId !== activeWorkspace.workspaceId) {
    redirect('/dashboard')
  }

  const role = membership.role

  // What this specific page is allowed to show, computed ONCE up
  // front — every gate below (the query itself, and every sidebar
  // panel) reads from these same five booleans instead of each
  // re-deriving its own role check. That's the actual point of
  // can() living in one file: this page never compares `role` to a
  // string anywhere past this block.
  const canViewClient = can(role, 'viewClient')
  const canViewInvoices = can(role, 'viewInvoices')
  const canManageGithubSecret = can(role, 'manageGithubWebhook')
  const canLinkGithub = can(role, 'linkGithubRepo')
  const canDraftShowcase = can(role, 'draftShowcase')

  // CHANGED — client and invoices are now only INCLUDED in the query
  // at all if the role permits viewing them (same principle as
  // buildProjectSelect in lib/project-permissions.js: never fetch
  // what you're not allowed to show, rather than fetch-then-hide).
  // Passing `false` for a relation in Prisma's `include` is valid and
  // means "leave this out" — for a Contributor, `project.client` and
  // `project.invoices` (and `milestone.invoices` for every milestone)
  // come back `undefined`, not populated-then-deleted.
  //
  // Because EVERY downstream component below (ProjectTabs,
  // MilestoneManager, ClientReviewCard) receives this SAME `project`
  // object, this one change protects all of them at once — none of
  // them has to do its own permission check to avoid rendering client
  // or invoice data that was never in the object to begin with.
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: canViewClient,
      updates: { orderBy: { createdAt: 'desc' } },
      files: { orderBy: { createdAt: 'desc' } },
      milestones: {
        orderBy: { order: 'asc' },
        include: {
          milestoneUpdates: { orderBy: { createdAt: 'asc' } },
          messages: { orderBy: { createdAt: 'asc' } }, // client thread — viewClientThread is true for every role, so always included
          invoices: canViewInvoices,
        },
      },
      invoices: canViewInvoices
        ? { orderBy: { createdAt: 'desc' }, include: { milestone: { select: { title: true } } } }
        : false,
    },
  })

  if (!project) notFound()

  // NEW — `include` only controls RELATIONS. githubWebhookSecret is a
  // plain scalar column on Project, so it comes back in full
  // regardless of role — `include` has no way to mask it. This is
  // the one field that needs an explicit redaction step after the
  // fetch. `displayProject` is what actually gets passed to
  // GithubConnectPanel below — never the raw `project` — so the real
  // secret never reaches this component's props for a PM or
  // Contributor.
  const displayProject = {
    ...project,
    githubWebhookSecret: canManageGithubSecret ? project.githubWebhookSecret : null,
  }

  const portalLink = buildPortalLink(project.client?.magicToken)
  const status = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.ACTIVE
  const StatusIcon = status.Icon
  const { completed, total, progress } = getMilestoneProgress(project.milestones)
  const daysActive = Math.max(
    0,
    Math.floor((Date.now() - new Date(project.createdAt).getTime()) / 86400000),
  )
  const clientViewedText = canViewClient ? timeAgoShort(project.client?.lastViewedAt) : null
  const clientInitial = canViewClient ? (project.client?.name?.[0]?.toUpperCase() ?? '?') : undefined
  // CHANGED — was `project.client?.name ?? 'No client assigned'`.
  // For a role without viewClient, that fallback would claim "no
  // client assigned" when a client almost certainly DOES exist
  // (every Project gets one at creation — see the POST /api/projects
  // route) — actively wrong information, not just a hidden detail.
  const clientName = canViewClient ? (project.client?.name ?? 'No client assigned') : 'Restricted'

  const startedLabel = new Date(project.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  // NEW — bundled permissions handed to child components that this
  // session didn't include the source for (MilestoneManager,
  // ProjectTabs, ClientReviewCard, ProjectMembersPanel). They don't
  // read this prop YET — it's a no-op until each component is updated
  // to actually branch on it — but the shape is here so wiring them
  // up later is a small, consistent change instead of another
  // from-scratch pass. See the note at the end of this response for
  // exactly what's still open.
  const permissions = {
    canManageMilestones: can(role, 'manageMilestones'),
    canPostToClientThread: can(role, 'postToClientThread'),
    canDeleteAnyTask: can(role, 'deleteAnyTask'),
    canUploadFiles: can(role, 'uploadFiles'),
    canManageFiles: can(role, 'deleteFiles'),
    canManageStaffing: can(role, 'manageStaffing'),
    canPublishShowcase: can(role, 'publishShowcase'),
    // NEW — added for ProjectTabs/InvoicesTab. canViewInvoices was
    // already being used above to shape the QUERY (whether
    // project.invoices exists at all), but ProjectTabs doesn't have
    // access to that reasoning — it only sees the `project` object
    // and this `permissions` bundle. Without an explicit flag here,
    // ProjectTabs has no way to know it should hide the Invoices tab
    // entirely for a Contributor, versus just rendering an empty one.
    canViewInvoices,
    canCreateInvoices: can(role, 'createInvoices'),
    canEditInvoices: can(role, 'editInvoices'),
  }

  return (
    <div>
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

          {/* CHANGED — Portal quick-actions, now gated behind
              canViewClient. The portal link embeds client.magicToken,
              a live bypass credential straight into the client's
              private portal — arguably MORE sensitive than the
              client's name/email, so it gets at least the same gate. */}
          {canViewClient && (
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
          )}
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
              clientName={canViewClient ? (project.client?.name ?? 'Client') : 'Client'}
              currentUserId={session.user.id}
              permissions={permissions}
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
              <ProjectTabs project={project} permissions={permissions} />
            </div>
          </section>

        </div>

        {/* CONTEXT PANEL */}

        <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">

          {/* Client Panel — CHANGED: the body is now gated behind
              canViewClient. A Contributor sees a plain "Restricted"
              notice instead of an empty-looking identity block. */}
          <PanelCard label="Client">
            {!canViewClient ? (
              <RestrictedNotice text="Client details are restricted for your role on this project." />
            ) : (
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
            )}
          </PanelCard>

          {/* Project Details Panel — unchanged. Status, dates,
              milestone progress %, and update/file COUNTS are visible
              to every role that reaches this page at all; none of
              this is client- or invoice-specific per the matrix. */}
          <PanelCard label="Project details">
            <div className="px-4 py-1 divide-y divide-fp-border">

              <DetailRow label="Status">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${status.className}`}
                >
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

            {/* Project Story — CHANGED: hidden entirely for a role
                without draftShowcase (Contributor). Publish itself is
                gated inside /story, which wasn't part of this upload —
                flagged below. */}
            {canDraftShowcase && (
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
            )}

            <ClientReviewCard project={project} permissions={permissions} />

            {/* Dialogs opened from the sidebar's project panel buttons
                (lib/project-panels.js). Add a new button there, then add a
                matching <ProjectPanelDialog panelId="..."> here — no other
                wiring needed. */}

            {/* CHANGED — GitHub dialog hidden entirely for a role
                without linkGithubRepo (Contributor gets no access at
                all here, matching the matrix). PM still gets the
                dialog (they can link a repo) but the panel now
                receives displayProject, not project — the real secret
                never reaches its props unless canManageGithubSecret
                is true. */}
            {canLinkGithub && (
              <ProjectPanelDialog
                panelId="github"
                title="Connect GitHub repository"
                description="Add a webhook so pushes to this project automatically appear in the client's update feed."
                bare
              >
                <GithubConnectPanel project={displayProject} canManageSecret={canManageGithubSecret} />
              </ProjectPanelDialog>
            )}

            <ProjectPanelDialog
              panelId="activity"
              title="Recent activity"
              description="A quick look at the latest updates on this project."
            >
              <RecentActivityPanel updates={project.updates} />
            </ProjectPanelDialog>

            <ProjectPanelDialog
              panelId="members"
              title="Project members"
              description="See who's staffed on this project, and add or remove teammates."
            >
              <ProjectMembersPanel projectId={project.id} permissions={permissions} />
            </ProjectPanelDialog>

          </div>

          {/* TaskBoard intentionally not rendered here. It needs one
              specific milestoneId, and this level of the page only has
              project.milestones (an array of possibly several) — there's
              no single "current milestone" to bind it to. Belongs inside
              MilestoneManager, once per milestone, not once per project
              down here in the sidebar. */}

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