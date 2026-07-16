import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
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
    className: 'bg-fp-success/10 text-fp-success',
    Icon: Circle,
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-fp-accent-muted text-fp-accent',
    Icon: CheckCircle2,
  },
  ON_HOLD: {
    label: 'On Hold',
    className: 'bg-fp-warning/10 text-fp-warning',
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

  // Parse + validate URL state
  const q = (first(sp?.q) ?? '').trim()
  const statusParam = (first(sp?.status) ?? '').toUpperCase()
  const status = VALID_STATUSES.has(statusParam) ? statusParam : null
  const sortParam = first(sp?.sort) ?? 'newest'
  const sort = VALID_SORTS.has(sortParam) ? sortParam : 'newest'
  const financial = first(sp?.financial) === 'unpaid' ? 'unpaid' : null
  const page = Math.max(1, parseInt(first(sp?.page), 10) || 1)

  const where = {
    userId: session.user.id,
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

  // Stats are simple indexed counts (not a full row fetch) so this stays
  // fast regardless of how many projects an account accumulates.
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
    prisma.project.count({ where: { userId: session.user.id } }),
    prisma.project.count({ where: { userId: session.user.id, status: 'ACTIVE' } }),
    prisma.project.count({ where: { userId: session.user.id, status: 'COMPLETED' } }),
    prisma.project.count({ where: { userId: session.user.id, status: 'ON_HOLD' } }),
    prisma.invoice.count({
      where: { status: 'UNPAID', project: { userId: session.user.id } },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(filteredCount / PROJECTS_PER_PAGE))
  const isEmptyAccount = totalCount === 0
  const isEmptyFiltered = !isEmptyAccount && projects.length === 0
  const hasFilters = Boolean(q || status || financial)

  // Builds a URL preserving current filter state, with explicit overrides.
  // Passing `null` for a key clears it; omitting a key keeps it as-is.
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

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="pb-24">

      {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
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

      {/* ── TOOLBAR — client island for search / sort ───────────────────── */}
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

      {/* ── PROJECT LIST ─────────────────────────────────────────────────── */}
      {isEmptyAccount ? (
        <EmptyAccountState />
      ) : isEmptyFiltered ? (
        <EmptyFilteredState clearHref="/dashboard/projects" />
      ) : (
        <div className="border border-fp-border rounded-lg overflow-hidden">

          {/* Column header — widths match ProjectRow exactly, sm+ only */}
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
              <ProjectRow key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}

      {/* ── PAGINATION ───────────────────────────────────────────────────── */}
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

// ─── ProjectRow ───────────────────────────────────────────────────────────────
// The whole row is one <Link> (no nested interactive elements), so it stays
// valid HTML and fully keyboard/click navigable to the project detail page.

function ProjectRow({ project }) {
  const status = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.ACTIVE
  const StatusIcon = status.Icon
  const { progress } = getMilestoneProgress(project.milestones)
  const unpaidCount = project.invoices.filter((inv) => inv.status === 'UNPAID').length
  const clientViewedText = timeAgoShort(project.client?.lastViewedAt)
  const clientInitial = project.client?.name?.[0]?.toUpperCase()

  return (
    <Link
      href={`/dashboard/projects/${project.id}`}
      className="group flex items-center gap-4 px-5 py-4 hover:bg-fp-raised/60 transition-colors duration-150"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-fp-accent/15 border border-fp-accent/20 flex items-center justify-center shrink-0">
        {clientInitial ? (
          <span className="text-sm font-bold text-fp-accent leading-none">{clientInitial}</span>
        ) : (
          <Briefcase className="w-4 h-4 text-fp-accent" />
        )}
      </div>

      {/* Name + client (mobile gets a condensed meta line in place of the
          columns hidden below sm) */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fp-text-primary truncate group-hover:text-fp-accent transition-colors duration-150">
          {project.name}
        </p>
        <p className="text-xs text-fp-text-tertiary truncate mt-0.5">
          {project.client?.name ?? 'No client assigned'}
        </p>
        <p className="sm:hidden flex items-center gap-1.5 text-[11px] text-fp-text-tertiary mt-1.5">
          <span className="font-semibold text-fp-accent tabular-nums">{progress}%</span>
          complete
          {unpaidCount > 0 && (
            <span className="text-fp-warning font-medium">· {unpaidCount} unpaid</span>
          )}
        </p>
      </div>

      {/* Progress — md+. One signal, one glance: bar + percentage. */}
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

      {/* Last client activity — lg+ */}
      <div className="hidden lg:flex items-center gap-2 w-36 shrink-0">
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            clientViewedText ? 'bg-fp-success ring-2 ring-fp-success/25' : 'bg-fp-border'
          }`}
        />
        <span className="text-xs text-fp-text-tertiary truncate">
          {clientViewedText ? `Seen ${clientViewedText}` : 'Not viewed'}
        </span>
      </div>

      {/* Invoices — sm+ */}
      <div className="hidden sm:block w-24 shrink-0">
        {unpaidCount > 0 ? (
          <span className="inline-flex items-center text-[10px] font-bold text-fp-warning bg-fp-warning/10 px-2 py-1 rounded-md whitespace-nowrap">
            {unpaidCount} unpaid
          </span>
        ) : (
          <span className="text-[10px] text-fp-text-tertiary">Settled</span>
        )}
      </div>

      {/* Status */}
      <div className="w-28 shrink-0">
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${status.className}`}
        >
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </span>
      </div>

      <ChevronRight className="w-4 h-4 text-fp-text-tertiary group-hover:text-fp-accent group-hover:translate-x-0.5 transition-all duration-150 shrink-0" />
    </Link>
  )
}

// ─── Empty states ─────────────────────────────────────────────────────────────

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