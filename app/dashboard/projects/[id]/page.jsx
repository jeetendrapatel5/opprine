// app/dashboard/projects/[id]/page.jsx

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getProjectAccess } from '@/lib/project'
import { requireWorkspaceMembership } from '@/lib/workspace'
import { can } from '@/lib/project-permissions'
import { getProjectBlockedLedger } from '@/lib/client-request-ledger'
import { getEntitlements } from '@/lib/billing/entitlements'
import { visibleProjectPanels } from '@/lib/project-panels'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, Briefcase, ExternalLink, Star } from 'lucide-react'

import ProjectTabs from '@/components/project/ProjectTabs'
import MilestoneManager from '@/components/dashboard/milestones'
import ClientReviewCard from '@/components/dashboard/ClientReviewCard'
import CopyButton from '@/components/project/CopyButton'
import GithubConnectPanel from '@/components/GithubConnectPanel'
import ProjectPanelDialog from '@/components/ProjectPanelDialog'
import RecentActivityPanel from '@/components/project/RecentActivityPanel'
import ProjectMembersPanel from '@/components/ProjectMembersPanel'
import ProjectMembersPrefetch from '@/components/ProjectMembersPrefetch'
import ClientRequestsPanel from '@/components/dashboard/requests/ClientRequestsPanel'
import ProjectAccessRestricted from '@/components/ProjectAccessRestricted'
import ProjectSidebar from '@/components/project/ProjectSidebar'
import ProjectInfoPanel from '@/components/project/ProjectInfoPanel'

//Status config

const STATUS_CONFIG = {
  ACTIVE: {
    label: 'Active',
    className: 'text-fp-success',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'text-fp-accent',
  },
  ON_HOLD: {
    label: 'On Hold',
    className: 'text-fp-warning',
  },
}

const COMPLETED_MILESTONE_STATUSES = new Set(['COMPLETED', 'APPROVED'])

//helpers 

function timeAgoShort(date) {
  if (!date) return null
  const diffMs = Date.now() - new Date(date).getTime()
  if (Number.isNaN(diffMs)) return null
  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// Whole days between a date and "now". Lives OUTSIDE the component on
// purpose: React's lint rule (react-hooks/purity) forbids calling
// Date.now() directly while a component renders. This page is a server
// component, so it runs once per request and behaves exactly as before.
function daysSince(date) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000))
}

// "Less than a day" / "1 day" / "12 days". The old code printed "1 days".
function formatDuration(days) {
  if (days < 1) return 'Less than a day'
  return `${days} ${days === 1 ? 'day' : 'days'}`
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

export default async function ProjectPage({ params }) {
  const resolvedParams = await params
  const id = resolvedParams?.id
  if (!id) notFound()

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/signin')

  // missing / outsider -> 404, unassigned workspace member -> restricted screen
  const access = await getProjectAccess(session.user.id, id)
  if (access.status === 'missing') notFound()

  // active-workspace guard: runs after authz, grants nothing.
  // stops another workspace's project rendering after a switch
  // (direct link, refresh, 2nd tab). light query: no client/invoice data loaded.
  const activeWorkspace = await requireWorkspaceMembership(session.user.id)
  const projectWorkspace = await prisma.project.findUnique({
    where: { id },
    select: { workspaceId: true },
  })
  if (projectWorkspace?.workspaceId !== activeWorkspace.workspaceId) {
    redirect('/dashboard')
  }

  // in workspace but not assigned: nothing else is loaded
  if (access.status === 'restricted') return <ProjectAccessRestricted />

  const role = access.role

  // What this specific page is allowed to show, computed ONCE up
  // front — every gate below (the query itself, and the sidebar)
  // reads from these same booleans instead of each re-deriving its
  // own role check. That's the actual point of
  // can() living in one file: this page never compares `role` to a
  // string anywhere past this block.
  const canViewClient = can(role, 'viewClient')
  const canViewInvoices = can(role, 'viewInvoices')
  const canManageGithubSecret = can(role, 'manageGithubWebhook')
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
  const { completed, total, progress } = getMilestoneProgress(project.milestones)
  const daysActive = daysSince(project.createdAt)
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
    // Client Requests panel (see lib/project-permissions.js)
    canViewClientRequests: can(role, 'viewClientRequests'),
    canManageClientRequests: can(role, 'manageClientRequests'),
  }

  // "Waiting on client" ledger for the milestone badges (null when this role may
  // not view client requests). A problem here, for example the database migration
  // not applied yet, must never break the project page: it just shows no badges.
  let blockedLedger = null
  try {
    blockedLedger = await getProjectBlockedLedger({ projectId: project.id, role })
  } catch (err) {
    console.error('[project page] Could not load the blocked-time ledger:', err)
  }

  // Which sidebar panels this viewer may open. This ONE list decides both which
  // rows are shown and which dialogs are mounted below (lib/project-panels.js
  // applies the plan gate and the role gate). A failure here must not break the
  // page: with no entitlements, plan-gated panels (GitHub) are simply hidden.
  let entitlements = null
  try {
    entitlements = await getEntitlements(activeWorkspace.workspaceId)
  } catch (err) {
    console.error('[project page] Could not load plan entitlements:', err)
  }
  const panels = visibleProjectPanels(entitlements, role)
  const hasPanel = (panelId) => panels.some((panel) => panel.id === panelId)

  // Small value shown at the right edge of a sidebar row. Panels not listed
  // here simply show no value.
  const panelMeta = {
    activity: { text: String(project.updates.length) },
    github: project.githubRepoName ? { text: 'Linked', dot: true } : { text: 'Not linked' },
  }

  // Client info for the sidebar card and the Project info dialog. null means
  // "this role may not see it": both places then show a restricted notice.
  const clientInfo = canViewClient
    ? {
        name: clientName,
        email: project.client?.email ?? null,
        initial: clientInitial,
        lastSeen: clientViewedText,
        lastSeenDate:
          clientViewedText && project.client?.lastViewedAt
            ? new Date(project.client.lastViewedAt).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric',
              })
            : null,
      }
    : null

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

              {/* NEW — compact client-engagement chip, promoted to
                  header level. It reuses clientInitial / clientName /
                  clientViewedText, which were already being computed
                  above for the sidebar Client panel — no new query,
                  no new derived value, just the same three variables
                  rendered a second time. It sits behind the exact same
                  canViewClient gate as the sidebar panel, so a
                  Contributor without that permission sees nothing
                  added here — not a broken or empty chip. The point:
                  "who's the client, have they looked at anything
                  recently" is answerable in one glance, without
                  scrolling to the sidebar. Full email/contact detail
                  still lives ONLY in the Client panel below — this
                  chip deliberately does not repeat the email. */}
              {canViewClient && (
                <span className="shrink-0 inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full border border-fp-border bg-fp-surface text-[11px] text-fp-text-secondary">
                  <span className="w-4 h-4 rounded-full bg-fp-accent/15 flex items-center justify-center text-[9px] font-bold text-fp-accent leading-none">
                    {clientInitial}
                  </span>
                  {clientName}
                  {clientViewedText && (
                    <span className="text-fp-text-tertiary"> {clientViewedText}</span>
                  )}
                </span>
              )}

              {/* NEW — client review, promoted from the very bottom of
                  the sidebar (it used to render under Project Story
                  and two dialog triggers, in the "Actions" stack) up
                  to header level, right next to Status. clientRating
                  is a plain Int? column directly on Project, so — like
                  githubWebhookSecret before displayProject existed —
                  it's a scalar the current `include` block has no way
                  to hide, and it's already being fetched and rendered
                  today for every role via <ClientReviewCard project=
                  {project} .../> a few dozen lines down, unconditionally.
                  So this badge doesn't newly expose anything; it just
                  makes the SAME already-visible fact visible sooner.
                  Flagging for later: if you want the review restricted
                  the way client/invoice data is, this needs its own
                  can(role, 'viewClientReview') key, plus a redaction
                  step on `project.clientRating` the same shape as
                  `displayProject` above — I didn't add that myself
                  since it would silently change who sees a review that
                  everyone can already see today. */}
              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-fp-warning/10 text-fp-warning">
                <Star className="w-3 h-3" />
                {project.clientRating ? `${project.clientRating}/5` : 'No review yet'}
              </span>
            </div>
            {project.description && (
              <p className="text-fp-text-secondary text-sm mt-1.5 max-w-2xl leading-relaxed">
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
              blockedLedger={blockedLedger}
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
              {/* displayProject: webhook secret redacted for non-owners */}
              <ProjectTabs project={displayProject} permissions={permissions} />
            </div>
          </section>

        </div>

        {/* CONTEXT PANEL */}
        <aside
          aria-label="Project overview and management"
          className="lg:col-span-4 lg:sticky lg:top-20"
        >
          {/* Project Story is hidden entirely for a role without
              draftShowcase (Contributor). Publish itself is gated inside
              /story. ClientReviewCard still receives displayProject, so
              nothing that was redacted above reaches it. */}
          <ProjectSidebar
            summary={{ progress, client: clientInfo }}
            panels={panels}
            panelMeta={panelMeta}
            story={
              canDraftShowcase
                ? {
                    href: `/dashboard/projects/${project.id}/story`,
                    enabled: Boolean(project.caseStudyEnabled),
                  }
                : null
            }
          >
            <ClientReviewCard project={displayProject} permissions={permissions} />
          </ProjectSidebar>

          {/* TaskBoard intentionally not rendered here. It needs one specific
              milestoneId, and this level of the page only has
              project.milestones (an array). It belongs inside
              MilestoneManager, once per milestone. */}
        </aside>

      </div>

      {/* Dialogs opened from the sidebar. The rows come from
          lib/project-panels.js. To add one: add the panel there, then add a
          matching <ProjectPanelDialog panelId="..."> here. "info" is the one
          exception: the summary card opens it, so it is not in that list. */}
      <ProjectPanelDialog
        panelId="info"
        title="Project info"
        description={`Client details and key numbers for ${project.name}.`}
        bare
        className="max-h-[90dvh] overflow-y-auto"
      >
        <ProjectInfoPanel
          projectName={project.name}
          status={status}
          client={clientInfo}
          stats={{
            startedLabel,
            durationLabel: formatDuration(daysActive),
            progress,
            updates: project.updates.length,
            files: project.files.length,
          }}
        />
      </ProjectPanelDialog>

      {/* GitHub: the panel list already applied the plan gate AND the role
          gate (Contributor gets none). A PM still gets the dialog (they can
          link a repo) but the panel receives displayProject, so the real
          secret never reaches its props unless canManageGithubSecret. */}
      {hasPanel('github') && (
        <ProjectPanelDialog
          panelId="github"
          title="Connect GitHub repository"
          description="Add a webhook so pushes to this project automatically appear in the client's update feed."
          bare
        >
          <GithubConnectPanel project={displayProject} canManageSecret={canManageGithubSecret} />
        </ProjectPanelDialog>
      )}

      {hasPanel('activity') && (
        <ProjectPanelDialog
          panelId="activity"
          title="Project activity"
          description="A quick look at the latest updates on this project."
        >
          <RecentActivityPanel updates={project.updates} />
        </ProjectPanelDialog>
      )}

      {/* Client Requests: the team's side of requests sent to the client.
          Only id + title of each milestone are passed down (the form's "for
          milestone" picker); permissions decide what the panel shows, the API
          routes enforce it. project.client is undefined for roles without
          viewClient, which is fine: those roles can't create requests. */}
      {hasPanel('requests') && (
        <ProjectPanelDialog
          panelId="requests"
          title="Client requests"
          description="Ask your client for answers or approvals, and see what is blocking the project."
          className="sm:max-w-2xl"
        >
          <ClientRequestsPanel
            projectId={project.id}
            milestones={project.milestones.map((m) => ({ id: m.id, title: m.title }))}
            hasClient={Boolean(project.client)}
            permissions={permissions}
          />
        </ProjectPanelDialog>
      )}

      {/* Project members. <ProjectMembersPrefetch> renders nothing: after the
          page has painted it fills the shared cache for THIS project, so the
          panel below opens with its list already loaded. It sits inside the
          hasPanel('members') check on purpose: only people who can see the
          "Project members" row ever trigger the request. */}
      {hasPanel('members') && (
        <>
          <ProjectMembersPrefetch projectId={project.id} />
          <ProjectPanelDialog
            panelId="members"
            title="Project members"
            description="See who's staffed on this project, and add or remove teammates."
          >
            <ProjectMembersPanel projectId={project.id} permissions={permissions} />
          </ProjectPanelDialog>
        </>
      )}
    </div>
  )
}