// app/dashboard/projects/page.jsx

import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { requireWorkspaceMembership } from '@/lib/workspace'
import { can } from '@/lib/project-permissions'
import Link from 'next/link'
import {
  Plus,
  Briefcase,
  Circle,
  CheckCircle2,
  PauseCircle,
  ChevronRight,
  ChevronLeft,
  SearchX,
} from 'lucide-react'

import ProjectsToolbar from '@/components/project/ProjectsToolbar'
import NewProjectModal from '@/components/NewProjectModal'

export const metadata = { title: 'Projects' }

export const dynamic = 'force-dynamic'

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
const PROJECTS_PER_PAGE = 10
const VALID_STATUSES = new Set(['ACTIVE', 'COMPLETED', 'ON_HOLD'])
const VALID_SORTS = new Set(['newest', 'oldest', 'name'])

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

function getMilestoneProgress(milestones = []) {
  const total = milestones.length
  const completed = milestones.filter((m) =>
    COMPLETED_MILESTONE_STATUSES.has(m?.status),
  ).length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0
  return { completed, total, progress }
}

function first(value) {
  return Array.isArray(value) ? value[0] : value
}

export default async function ProjectsPage({ searchParams }) {
  const sp = await searchParams

  const session = await getServerSession(authOptions)
  if (!session) redirect('/signin')

  const membership = await requireWorkspaceMembership(session.user.id)

  // NEW — this is the actual fix. requireWorkspaceMembership only
  // tells us "is this person in the workspace at all" — it says
  // nothing about which INDIVIDUAL projects they're staffed on. The
  // old version skipped that check entirely and just listed every
  // project in the workspace, so a Contributor staffed on one project
  // saw client names and invoice badges for every OTHER project too.
  //
  // OWNER/ADMIN keep seeing the whole workspace (matches their
  // implicit access everywhere else in the app — see
  // requireProjectMembership in lib/project.js). Everyone else only
  // sees projects they actually have a ProjectMember row on.
  const isImplicitOwnerOrAdmin = ['OWNER', 'ADMIN'].includes(membership.role)

  // A user can be PROJECT_MANAGER on one project and CONTRIBUTOR on
  // another AT THE SAME TIME — role isn't uniform across this list,
  // so we need the role PER PROJECT, not one role for the whole page.
  const myMemberships = isImplicitOwnerOrAdmin
    ? []
    : await prisma.projectMember.findMany({
        where: { userId: session.user.id, project: { workspaceId: membership.workspaceId } },
        select: { projectId: true, role: true },
      })

  // null = "no restriction" (implicit Owner/Admin sees everything).
  // Otherwise, only the specific project IDs this user is staffed on.
  const accessibleProjectIds = isImplicitOwnerOrAdmin
    ? null
    : myMemberships.map((m) => m.projectId)

  const roleByProjectId = new Map(myMemberships.map((m) => [m.projectId, m.role]))
  function roleForProject(projectId) {
    return isImplicitOwnerOrAdmin ? membership.role : (roleByProjectId.get(projectId) ?? null)
  }

  // Same restriction applied to the "unpaid invoices" banner count,
  // for a narrower reason: even a project this user IS staffed on
  // might have their role set to CONTRIBUTOR, who has no invoice
  // visibility at all on that project. Without this, the banner would
  // leak a financial signal ("there ARE unpaid invoices out there")
  // about projects whose invoice details this user can't see.
  const invoiceVisibleProjectIds = isImplicitOwnerOrAdmin
    ? null
    : myMemberships.filter((m) => can(m.role, 'viewInvoices')).map((m) => m.projectId)

  const q = (first(sp?.q) ?? '').trim()
  const statusParam = (first(sp?.status) ?? '').toUpperCase()
  const status = VALID_STATUSES.has(statusParam) ? statusParam : null
  const sortParam = first(sp?.sort) ?? 'newest'
  const sort = VALID_SORTS.has(sortParam) ? sortParam : 'newest'
  const financial = first(sp?.financial) === 'unpaid' ? 'unpaid' : null
  const page = Math.max(1, parseInt(first(sp?.page), 10) || 1)

  // accessScope gets spread into every count/list query below, so the
  // "which projects exist" restriction is applied consistently —
  // there's no path left where the list, the pagination total, or the
  // status tab counts disagree with each other about what this user
  // can see.
  const accessScope = accessibleProjectIds !== null ? { id: { in: accessibleProjectIds } } : {}

  const where = {
    workspaceId: membership.workspaceId,
    ...accessScope,
    ...(status ? { status } : {}),
    ...(financial === 'unpaid' ? { invoices: { some: { status: 'UNPAID' } } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { client: { name: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }

  const orderBy =
    sort === 'oldest' ? { createdAt: 'asc' } :
    sort === 'name'   ? { name: 'asc' } :
    { createdAt: 'desc' }

  const [
    projects,
    filteredCount,
    totalCount,
    activeCount,
    completedCount,
    onHoldCount,
    unpaidInvoicesCount,
  ] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy,
      skip: (page - 1) * PROJECTS_PER_PAGE,
      take: PROJECTS_PER_PAGE,
      include: {
        client: true,
        milestones: { select: { status: true } },
        invoices: { select: { status: true } },
      },
    }),
    prisma.project.count({ where }),
    prisma.project.count({ where: { workspaceId: membership.workspaceId, ...accessScope } }),
    prisma.project.count({ where: { workspaceId: membership.workspaceId, ...accessScope, status: 'ACTIVE' } }),
    prisma.project.count({ where: { workspaceId: membership.workspaceId, ...accessScope, status: 'COMPLETED' } }),
    prisma.project.count({ where: { workspaceId: membership.workspaceId, ...accessScope, status: 'ON_HOLD' } }),
    prisma.invoice.count({
      where: {
        status: 'UNPAID',
        project: {
          workspaceId: membership.workspaceId,
          ...(invoiceVisibleProjectIds !== null ? { id: { in: invoiceVisibleProjectIds } } : {}),
        },
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(filteredCount / PROJECTS_PER_PAGE))
  const isEmptyAccount = totalCount === 0
  const isEmptyFiltered = !isEmptyAccount && projects.length === 0
  const hasFilters = Boolean(q || status || financial)

  function buildHref(overrides = {}) {
    const next = {
      q,
      status,
      sort: sort !== 'newest' ? sort : null,
      financial,
      page: null,
      ...overrides,
    }
    const params = new URLSearchParams()
    if (next.q) params.set('q', next.q)
    if (next.status) params.set('status', next.status)
    if (next.sort) params.set('sort', next.sort)
    if (next.financial) params.set('financial', next.financial)
    if (next.page && next.page > 1) params.set('page', String(next.page))
    const qs = params.toString()
    return qs ? `/dashboard/projects?${qs}` : '/dashboard/projects'
  }

  const resultsLabel = hasFilters
    ? `${filteredCount} ${filteredCount === 1 ? 'result' : 'results'}`
    : null
  const clearFinancialHref = financial ? buildHref({ financial: null }) : null

  return (
    <div className="pb-24">

      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <h1 className="font-[poppins] text-xl font-semibold text-fp-text-secondary leading-tight">
          Projects
        </h1>

        <NewProjectModal userId={session.user.id} />
      </div>

      {unpaidInvoicesCount > 0 && financial !== 'unpaid' && (
        <Link
          href={buildHref({ financial: 'unpaid', status: null })}
          className="
            flex items-center gap-2.5 px-4 py-2.5 mb-5 rounded-lg
            bg-fp-warning/5 border border-fp-warning/8
            hover:border-fp-warning/15 transition-colors duration-150 group
          "
        >
          <span className="w-1.5 h-1.5 rounded-full bg-fp-danger shrink-0" />
          <p className="text-xs text-fp-text-primary flex-1">
            <span className="font-semibold text-fp-danger">
              {unpaidInvoicesCount} Unpaid Invoice{unpaidInvoicesCount !== 1 ? 's' : ''}
            </span>{' '}
            across your projects
          </p>
          <span className="text-[11px] font-medium text-fp-warning flex items-center gap-1 shrink-0 group-hover:gap-1.5 transition-all duration-150">
            View
            <ChevronRight className="w-3 h-3" />
          </span>
        </Link>
      )}

      {!isEmptyAccount && (
        <Suspense
          fallback={
            <div className="flex items-center gap-3 mb-5">
              <div className="h-9 flex-1 sm:max-w-xs rounded-lg bg-fp-raised animate-pulse" />
              <div className="h-9 w-40 rounded-lg bg-fp-raised animate-pulse hidden sm:block ml-auto" />
            </div>
          }
        >
          <ProjectsToolbar
            resultsLabel={resultsLabel}
            financialChip={
              financial === 'unpaid'
                ? { label: 'Unpaid invoices', clearHref: clearFinancialHref }
                : null
            }
          />
        </Suspense>
      )}

      {isEmptyAccount ? (
        <EmptyAccountState />
      ) : isEmptyFiltered ? (
        <EmptyFilteredState clearHref="/dashboard/projects" />
      ) : (
        <div className="border border-fp-border rounded-lg overflow-hidden">

          <div className="hidden sm:flex items-center gap-4 px-5 py-2.5 bg-fp-raised/40 border-b border-fp-border">
            <div className="w-10 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-fp-text-tertiary uppercase tracking-widest">
                Project
              </p>
            </div>
            <div className="hidden md:block w-32 shrink-0">
              <p className="text-[10px] font-bold text-fp-text-tertiary uppercase tracking-widest">
                Progress
              </p>
            </div>
            <div className="hidden lg:block w-36 shrink-0">
              <p className="text-[10px] font-bold text-fp-text-tertiary uppercase tracking-widest">
                Activity
              </p>
            </div>
            <div className="hidden sm:block w-24 shrink-0">
              <p className="text-[10px] font-bold text-fp-text-tertiary uppercase tracking-widest">
                Invoices
              </p>
            </div>
            <div className="w-28 shrink-0">
              <p className="text-[10px] font-bold text-fp-text-tertiary uppercase tracking-widest">
                Status
              </p>
            </div>
            <div className="w-4 shrink-0" />
          </div>

          <div className="divide-y divide-fp-border">
            {projects.map((project) => (
              <ProjectRow key={project.id} project={project} role={roleForProject(project.id)} />
            ))}
          </div>
        </div>
      )}

      {!isEmptyFiltered && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-fp-border">
          <Link
            href={buildHref({ page: Math.max(1, page - 1) })}
            aria-disabled={page === 1}
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border transition-colors duration-150 ${
              page === 1
                ? 'text-fp-text-tertiary/50 border-fp-border pointer-events-none'
                : 'text-fp-text-secondary border-fp-border bg-fp-surface hover:text-fp-text-primary hover:border-fp-border/80'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </Link>

          <p className="text-xs text-fp-text-tertiary tabular-nums">
            Page {page} of {totalPages}
          </p>

          <Link
            href={buildHref({ page: Math.min(totalPages, page + 1) })}
            aria-disabled={page === totalPages}
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border transition-colors duration-150 ${
              page === totalPages
                ? 'text-fp-text-tertiary/50 border-fp-border pointer-events-none'
                : 'text-fp-text-secondary border-fp-border bg-fp-surface hover:text-fp-text-primary hover:border-fp-border/80'
            }`}
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

    </div>
  )
}

// CHANGED — this component now takes a `role` prop and gates
// everything client/invoice-related through can(), instead of
// unconditionally reading project.client / project.invoices. `role`
// can be null if somehow this row's project isn't in roleByProjectId
// (shouldn't happen given the query is already scoped to accessible
// projects, but can() fails closed on an unrecognized role anyway, so
// this stays safe even if that assumption is ever wrong).
function ProjectRow({ project, role }) {
  const status = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.ACTIVE
  const { progress } = getMilestoneProgress(project.milestones)

  const canViewClient = can(role, 'viewClient')
  const canViewInvoices = can(role, 'viewInvoices')

  const unpaidCount = canViewInvoices
    ? project.invoices.filter((inv) => inv.status === 'UNPAID').length
    : 0
  const clientViewedText = canViewClient ? timeAgoShort(project.client?.lastViewedAt) : null
  const clientInitial = canViewClient ? project.client?.name?.[0]?.toUpperCase() : undefined

  return (
    <Link
      href={`/dashboard/projects/${project.id}`}
      className="group flex items-center gap-4 px-5 py-4 hover:bg-fp-raised/60 transition-colors duration-150"
    >
      <div className="w-10 h-10 rounded-full bg-fp-accent/15 border border-fp-accent/20 flex items-center justify-center shrink-0">
        {clientInitial ? (
          <span className="text-sm font-bold text-fp-accent leading-none">{clientInitial}</span>
        ) : (
          <Briefcase className="w-4 h-4 text-fp-accent" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fp-text-primary truncate group-hover:text-fp-accent transition-colors duration-150">
          {project.name}
        </p>
        {/* CHANGED — was project.client?.name ?? 'No client assigned'.
            That fallback text is a LIE for a Contributor: there IS a
            client, they just can't see it. Saying "No client
            assigned" would actively misinform them about the
            project's state, not just hide a detail. */}
        <p className="text-xs text-fp-text-tertiary truncate mt-0.5">
          {canViewClient ? (project.client?.name ?? 'No client assigned') : 'Client info restricted'}
        </p>
        <p className="sm:hidden flex items-center gap-1.5 text-[11px] text-fp-text-tertiary mt-1.5">
          <span className="font-semibold text-fp-accent tabular-nums">{progress}%</span>
          complete
          {canViewInvoices && unpaidCount > 0 && (
            <span className="text-fp-warning font-medium">· {unpaidCount} unpaid</span>
          )}
        </p>
      </div>

      <div className="hidden md:flex items-center gap-2 w-32 shrink-0">
        <div className="flex-1 h-1.5 bg-fp-raised rounded-full overflow-hidden">
          <div
            className="h-full bg-fp-accent rounded-full transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[11px] font-semibold text-fp-text-secondary tabular-nums shrink-0 w-9 text-right">
          {progress}%
        </span>
      </div>

      <div className="hidden lg:flex items-center gap-2 w-36 shrink-0">
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            clientViewedText ? 'bg-fp-success ring-2 ring-fp-success/25' : 'bg-fp-border'
          }`}
        />
        <span className="text-xs text-fp-text-tertiary truncate">
          {canViewClient ? (clientViewedText ? `Seen ${clientViewedText}` : 'Not viewed') : '—'}
        </span>
      </div>

      {/* CHANGED — was unconditional. A Contributor now sees an em
          dash instead of a "Settled" badge, which used to be an
          outright false claim (we simply don't know, and don't tell
          them, whether it's settled). */}
      <div className="hidden sm:block w-24 shrink-0">
        {!canViewInvoices ? (
          <span className="text-[10px] text-fp-text-tertiary">—</span>
        ) : unpaidCount > 0 ? (
          <span className="inline-flex items-center text-[10px] font-bold text-fp-warning bg-fp-warning/10 px-2 py-1 rounded-md whitespace-nowrap">
            {unpaidCount} unpaid
          </span>
        ) : (
          <span className="text-[10px] text-fp-text-tertiary">Settled</span>
        )}
      </div>

      <div className="w-28 shrink-0">
        <span
          className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest py-1 rounded-md ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <ChevronRight className="w-4 h-4 text-fp-text-tertiary group-hover:text-fp-accent group-hover:translate-x-0.5 transition-all duration-150 shrink-0" />
    </Link>
  )
}

function EmptyAccountState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 bg-fp-surface border border-fp-border rounded-xl">
      <div className="w-12 h-12 rounded-full bg-fp-raised border border-fp-border flex items-center justify-center mb-4">
        <Briefcase className="w-5 h-5 text-fp-text-tertiary" />
      </div>
      <h3 className="text-sm font-semibold text-fp-text-primary">No projects yet</h3>
      <p className="text-xs text-fp-text-tertiary mt-1.5 max-w-sm">
        Create your first project to start sharing milestones, files and a client portal link.
      </p>
      <Link
        href="/dashboard/projects/new"
        className="
          mt-5 inline-flex items-center gap-1.5
          h-8 px-4 rounded-lg
          bg-fp-accent text-black text-xs font-semibold
          hover:opacity-90 transition-opacity
        "
      >
        <Plus className="w-3.5 h-3.5" />
        New project
      </Link>
    </div>
  )
}

function EmptyFilteredState({ clearHref }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 bg-fp-surface border border-fp-border rounded-xl">
      <div className="w-12 h-12 rounded-full bg-fp-raised border border-fp-border flex items-center justify-center mb-4">
        <SearchX className="w-5 h-5 text-fp-text-tertiary" />
      </div>
      <h3 className="text-sm font-semibold text-fp-text-primary">No matching projects</h3>
      <p className="text-xs text-fp-text-tertiary mt-1.5 max-w-sm">
        Try a different search term, or clear your filters to see everything.
      </p>
      <Link
        href={clearHref}
        className="
          mt-5 inline-flex items-center gap-1.5
          h-8 px-4 rounded-lg
          bg-fp-surface border border-fp-border
          text-fp-text-secondary hover:text-fp-text-primary
          text-xs font-medium transition-colors duration-150
        "
      >
        Clear filters
      </Link>
    </div>
  )
}