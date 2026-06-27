// components/ClientsView.jsx
// ─────────────────────────────────────────────────────────────────────────────
// CLIENT COMPONENT — all interactivity for the Clients page.
//
// Responsibilities:
//   - Search: filter by client name, email, or project name
//   - Sort:   toggle sort column + direction (name / last seen / revenue / added)
//   - Copy:   generate and copy the client's magic-link portal URL
//   - Layout: desktop table (lg+) + mobile card list (<lg)
//   - States: pending revenue banner, empty list, empty search result
//
// Props:
//   clients        — array of serialized Client rows (dates as ISO strings)
//   pendingRevenue — sum of all UNPAID invoices across all clients (number)
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
    Search,
    Mail,
    Copy,
    Check,
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
    ExternalLink,
    Clock,
    Users,
    ArrowRight,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

// Portal base path — adjust if your magic-link route differs
const PORTAL_BASE = '/portal'

// 6 distinct color pairs tuned for the dark fp-base background.
// Colors are chosen so they don't clash with fp-accent (green) or fp-warning.
// Hash of the client name determines which color they always get (deterministic).
const AVATAR_COLORS = [
    { bg: 'bg-emerald-500/[0.12]', text: 'text-emerald-400', ring: 'ring-emerald-500/[0.2]' },
    { bg: 'bg-sky-500/[0.12]', text: 'text-sky-400', ring: 'ring-sky-500/[0.2]' },
    { bg: 'bg-violet-500/[0.12]', text: 'text-violet-400', ring: 'ring-violet-500/[0.2]' },
    { bg: 'bg-amber-500/[0.12]', text: 'text-amber-400', ring: 'ring-amber-500/[0.2]' },
    { bg: 'bg-rose-500/[0.12]', text: 'text-rose-400', ring: 'ring-rose-500/[0.2]' },
    { bg: 'bg-cyan-500/[0.12]', text: 'text-cyan-400', ring: 'ring-cyan-500/[0.2]' },
]

// Project status → display label + Tailwind classes
// Using ring-1 for the pill border so it matches the rest of the fp-* system
const STATUS_CONFIG = {
    ACTIVE: {
        label: 'Active',
        cls: 'bg-fp-accent/10 text-fp-accent ring-1 ring-fp-accent/[0.2]',
    },
    COMPLETED: {
        label: 'Completed',
        cls: 'bg-fp-text-tertiary/[0.08] text-fp-text-secondary ring-1 ring-fp-border',
    },
    ON_HOLD: {
        label: 'On hold',
        cls: 'bg-fp-warning/10 text-fp-warning ring-1 ring-fp-warning/[0.2]',
    },
}

// Desktop table column widths — shared between header row and data rows
// via inline `style` to avoid needing arbitrary Tailwind grid classes
const GRID_STYLE = {
    gridTemplateColumns:
        'minmax(190px, 2fr) minmax(140px, 1.2fr) 138px 110px 96px 44px',
}

// ─────────────────────────────────────────────────────────────────────────────
// PURE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deterministic avatar color from client name.
 * Same name → same color every render, across sessions.
 */
function avatarColor(name) {
    const hash = [...name].reduce((h, c) => h + c.charCodeAt(0), 0)
    return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

/**
 * Convert a nullable ISO date string to a human-readable relative label
 * and a Tailwind color class for the activity dot.
 *
 * Color semantics:
 *   green  = active recently (visited in last week)
 *   amber  = gone cold (1–4 weeks ago)
 *   muted  = inactive / never (>4 weeks or null)
 */
function relativeActivity(isoStr) {
    if (!isoStr) return { label: 'Never opened', dotCls: 'bg-fp-text-tertiary/40' }

    const diffDays = (Date.now() - new Date(isoStr).getTime()) / 86_400_000

    if (diffDays < 1) return { label: 'Today', dotCls: 'bg-emerald-400' }
    if (diffDays < 2) return { label: 'Yesterday', dotCls: 'bg-emerald-400' }
    if (diffDays < 7) return { label: `${Math.floor(diffDays)}d ago`, dotCls: 'bg-emerald-400/70' }
    if (diffDays < 14) return { label: `${Math.floor(diffDays / 7)}w ago`, dotCls: 'bg-fp-warning/80' }
    if (diffDays < 60) return { label: `${Math.floor(diffDays / 7)}w ago`, dotCls: 'bg-fp-warning/50' }
    return { label: `${Math.floor(diffDays / 30)}mo ago`, dotCls: 'bg-fp-text-tertiary/40' }
}

/**
 * Sum invoice amounts for a given status ('PAID' | 'UNPAID').
 */
function sumInvoices(invoices, status) {
    return invoices
        .filter(i => i.status === status)
        .reduce((s, i) => s + i.amount, 0)
}

/**
 * Format a number as currency.
 * Returns null for 0 so the caller can show a dash instead.
 */
function money(amount, currency = 'USD') {
    if (!amount) return null
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

/**
 * Return a new sorted array without mutating the input.
 * sortKey: 'name' | 'activity' | 'revenue' | 'added'
 * sortDir: 'asc' | 'desc'
 */
function sortClients(list, sortKey, sortDir) {
    const dir = sortDir === 'asc' ? 1 : -1

    return [...list].sort((a, b) => {
        switch (sortKey) {
            case 'name':
                return dir * a.name.toLowerCase().localeCompare(b.name.toLowerCase())

            case 'activity': {
                const ta = a.lastViewedAt ? new Date(a.lastViewedAt).getTime() : 0
                const tb = b.lastViewedAt ? new Date(b.lastViewedAt).getTime() : 0
                return dir * (ta - tb)
            }

            case 'revenue': {
                const ra = sumInvoices(a.project.invoices, 'PAID')
                const rb = sumInvoices(b.project.invoices, 'PAID')
                return dir * (ra - rb)
            }

            case 'added':
                return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

            default:
                return 0
        }
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS  (defined here rather than in separate files because they
// are tightly coupled to this view and share its type constraints)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clickable sort button used in the table header.
 * Shows an up/down/neutral chevron depending on sort state.
 */
function SortButton({ label, col, sortKey, sortDir, onSort }) {
    const active = sortKey === col
    const Icon = active
        ? (sortDir === 'asc' ? ChevronUp : ChevronDown)
        : ChevronsUpDown

    return (
        <button
            onClick={() => onSort(col)}
            className={[
                'flex items-center gap-1 text-xs font-semibold uppercase tracking-widest',
                'transition-colors select-none',
                active
                    ? 'text-fp-text-primary'
                    : 'text-fp-text-tertiary hover:text-fp-text-secondary',
            ].join(' ')}
        >
            {label}
            <Icon className="w-3 h-3 shrink-0 opacity-70" />
        </button>
    )
}

/**
 * Circular avatar that shows the client's initial letter.
 * Color is deterministic from the client's name (same person → same color).
 */
function Avatar({ name }) {
    const { bg, text, ring } = avatarColor(name ?? 'U')
    return (
        <div
            className={`
        w-8 h-8 rounded-full shrink-0 flex items-center justify-center
        ring-1 ${bg} ${text} ${ring}
      `}
        >
            <span className="text-xs font-semibold leading-none">
                {name?.[0]?.toUpperCase() ?? 'U'}
            </span>
        </div>
    )
}

/**
 * Small pill badge for project status.
 * Falls back to ACTIVE styling if an unknown status is passed.
 */
function StatusBadge({ status }) {
    const { label, cls } = STATUS_CONFIG[status] ?? STATUS_CONFIG.ACTIVE
    return (
        <span
            className={`
        inline-flex items-center px-2 py-[3px] rounded-full
        text-[11px] font-medium leading-none ${cls}
      `}
        >
            {label}
        </span>
    )
}

/**
 * Milestone progress expressed as "X / Y done" with a thin progress track.
 * Shows nothing if there are no milestones.
 */
function MilestoneProgress({ milestones }) {
    if (!milestones?.length) return <span className="text-xs text-fp-text-tertiary">—</span>

    const total = milestones.length
    const completed = milestones.filter(m => m.status === 'COMPLETED').length
    const pct = Math.round((completed / total) * 100)

    return (
        <div className="flex items-center gap-2">
            {/* Thin progress track */}
            <div className="w-12 h-1 rounded-full bg-fp-border overflow-hidden">
                <div
                    className="h-full rounded-full bg-fp-accent/60 transition-[width]"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-xs text-fp-text-tertiary tabular-nums">
                {completed}/{total}
            </span>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ClientsView({ clients, pendingRevenue }) {

    // ── State ─────────────────────────────────────────────────────────────────
    const [search, setSearch] = useState('')
    const [sortKey, setSortKey] = useState('added')   // default: newest first
    const [sortDir, setSortDir] = useState('desc')
    const [copiedId, setCopiedId] = useState(null)      // tracks which row's link was just copied

    // ── Handlers ──────────────────────────────────────────────────────────────

    /**
     * Toggle sort direction if clicking the same column,
     * or switch to new column (descending by default).
     */
    const handleSort = useCallback((col) => {
        if (sortKey === col) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(col)
            setSortDir('desc')
        }
    }, [sortKey])

    /**
     * Copy the client's magic-link portal URL to the clipboard.
     * Shows a brief ✓ check icon on the button for 2 seconds as feedback.
     */
    const handleCopy = useCallback(async (client) => {
        const url = `${window.location.origin}${PORTAL_BASE}/${client.magicToken}`
        try {
            await navigator.clipboard.writeText(url)
            setCopiedId(client.id)
            setTimeout(() => setCopiedId(id => id === client.id ? null : id), 2000)
        } catch {
            // clipboard API not available (unlikely, but fail silently)
        }
    }, [])

    // Derived data
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()

        const base = q
            ? clients.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.email.toLowerCase().includes(q) ||
                c.project.name.toLowerCase().includes(q)
            )
            : clients

        return sortClients(base, sortKey, sortDir)
    }, [clients, search, sortKey, sortDir])

    // Count clients with pending (unpaid) invoices — used in the banner message
    const pendingCount = useMemo(
        () => clients.filter(c => sumInvoices(c.project.invoices, 'UNPAID') > 0).length,
        [clients]
    )

    // Empty state (no clients at all)
    // Different from "search found nothing" — shown when the user has zero clients
    if (clients.length === 0) {
        return (
            <div className="mt-8">
                <div className="border border-dashed border-fp-border rounded-xl py-16 flex flex-col items-center justify-center text-center px-4">
                    <div className="w-10 h-10 rounded-xl bg-fp-surface border border-fp-border flex items-center justify-center mb-4">
                        <Users className="w-5 h-5 text-fp-text-tertiary" />
                    </div>
                    <p className="text-fp-text-primary text-sm font-medium mb-1">
                        No clients yet
                    </p>
                    <p className="text-fp-text-tertiary text-xs max-w-[260px] mb-6 leading-relaxed">
                        Clients are added when you create a project. Each project gets its own
                        private portal your client accesses with a single magic link.
                    </p>
                    <Link
                        href="/dashboard/projects"
                        className="
              inline-flex items-center gap-1.5 px-3.5 py-1.5
              text-xs font-semibold text-black
              bg-fp-accent rounded-lg
              hover:opacity-90 transition-opacity
            "
                    >
                        Go to Projects
                    </Link>
                </div>
            </div>
        )
    }

    // Main render
    return (
        <div className="mt-15">

            {/* ── Pending revenue banner ───────────────────────────────────────── */}
            {/* Only shown when there are unpaid invoices across client projects.  */}
            {pendingRevenue > 0 && (
                <div className="mb-5 flex items-center gap-3 bg-fp-warning/[0.06] border border-fp-warning/[0.15] rounded-xl px-4 py-3">
                    <Clock className="w-4 h-4 text-fp-warning shrink-0" />
                    <p className="text-sm text-fp-warning/90">
                        <span className="font-semibold text-fp-warning">
                            {money(pendingRevenue)}
                        </span>{' '}
                        pending across{' '}
                        {pendingCount} {pendingCount === 1 ? 'client' : 'clients'}.{' '}
                        <Link
                            href="/dashboard/invoices"
                            className="underline underline-offset-2 hover:text-fp-warning transition-colors"
                        >
                            View invoices
                        </Link>
                    </p>
                    <ArrowRight className='text-fp-warning h-4.5' />
                </div>
            )}

            {/* ── Section label + search ───────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-fp-text-secondary text-xs font-semibold uppercase tracking-widest">
                    Your Clients
                </h2>

                {/* Search — filters name, email, and project name in real time */}
                <div className="relative">
                    <Search className="
            absolute left-3 top-1/2 -translate-y-1/2
            w-3.5 h-3.5 text-fp-text-tertiary pointer-events-none
          " />
                    <input
                        type="search"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search clients or projects…"
                        className="
              pl-8 pr-3 py-1.5 w-52
              text-xs text-fp-text-primary placeholder:text-fp-text-tertiary
              bg-fp-surface border border-fp-border rounded-lg
              focus:outline-none focus:ring-1
              focus:ring-[var(--color-fp-accent)]/40
              focus:border-[var(--color-fp-accent)]/40
              transition-colors
            "
                    />
                </div>
            </div>

            {/* ── Table ────────────────────────────────────────────────────────── */}
            <div className="border border-fp-border rounded-xl overflow-hidden">

                {/* ── Desktop table header (lg+) ─────────────────────────────────── */}
                <div
                    className="hidden lg:grid gap-4 items-center px-5 py-2.5
                     border-b border-fp-border bg-fp-surface/40"
                    style={GRID_STYLE}
                >
                    <SortButton
                        label="Client"
                        col="name"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                    />
                    <span className="text-xs font-semibold uppercase tracking-widest text-fp-text-tertiary">
                        Project
                    </span>
                    <SortButton
                        label="Last seen"
                        col="activity"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                    />
                    <SortButton
                        label="Revenue"
                        col="revenue"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                    />
                    <span className="text-xs font-semibold uppercase tracking-widest text-fp-text-tertiary">
                        Status
                    </span>
                    {/* Actions column — no label */}
                    <span />
                </div>

                {/* ── Empty search result ────────────────────────────────────────── */}
                {filtered.length === 0 && (
                    <div className="py-12 text-center">
                        <p className="text-fp-text-tertiary text-sm">
                            No clients match <span className="text-fp-text-secondary">"{search}"</span>
                        </p>
                    </div>
                )}

                {/* ── Client rows ───────────────────────────────────────────────── */}
                {filtered.map((client, idx) => {
                    // Precompute per-row display values
                    const { label: actLabel, dotCls } = relativeActivity(client.lastViewedAt)
                    const paid = sumInvoices(client.project.invoices, 'PAID')
                    const pending = sumInvoices(client.project.invoices, 'UNPAID')
                    const total = paid + pending
                    const currency = client.project.invoices[0]?.currency ?? 'USD'
                    const isCopied = copiedId === client.id
                    const isLast = idx === filtered.length - 1
                    const rowBorder = !isLast ? 'border-b border-fp-border' : ''

                    return (
                        <div key={client.id}>

                            {/* ── Desktop row (lg+) ──────────────────────────────────── */}
                            <div
                                className={`
                  group hidden lg:grid gap-4 items-center px-5 py-4
                  transition-colors hover:bg-fp-surface/30 ${rowBorder}
                `}
                                style={GRID_STYLE}
                            >

                                {/* Col 1 — Client: avatar + name + email */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <Avatar name={client.name} />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-fp-text-primary truncate leading-snug">
                                            {client.name}
                                        </p>
                                        <p className="text-[11px] text-fp-text-tertiary truncate leading-snug mt-0.5">
                                            {client.email}
                                        </p>
                                    </div>
                                </div>

                                {/* Col 2 — Project: name + milestone progress */}
                                <div className="min-w-0">
                                    <Link
                                        href={`/dashboard/projects/${client.project.id}`}
                                        className="
                      text-sm text-fp-text-secondary truncate leading-snug
                      hover:text-fp-text-primary transition-colors block
                    "
                                    >
                                        {client.project.name}
                                    </Link>
                                    <div className="mt-1">
                                        <MilestoneProgress milestones={client.project.milestones} />
                                    </div>
                                </div>

                                {/* Col 3 — Last seen: colored dot + relative time */}
                                <div className="flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} />
                                    <span className="text-sm text-fp-text-secondary">{actLabel}</span>
                                </div>

                                {/* Col 4 — Revenue: paid amount + pending note */}
                                <div>
                                    {total > 0 ? (
                                        <>
                                            <p className="text-sm font-medium text-fp-text-primary tabular-nums">
                                                {money(paid, currency) ?? (
                                                    <span className="text-fp-text-tertiary font-normal">$0</span>
                                                )}
                                            </p>
                                            {pending > 0 && (
                                                <p className="text-[11px] text-fp-warning/80 mt-0.5 tabular-nums">
                                                    +{money(pending, currency)} due
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-sm text-fp-text-tertiary">—</span>
                                    )}
                                </div>

                                {/* Col 5 — Status chip */}
                                <div>
                                    <StatusBadge status={client.project.status} />
                                </div>

                                {/* Col 6 — Actions: appear on row hover only */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">

                                    {/* Copy portal link */}
                                    <button
                                        onClick={() => handleCopy(client)}
                                        title={isCopied ? 'Copied!' : 'Copy portal link'}
                                        className="
                      w-7 h-7 flex items-center justify-center rounded-md
                      text-fp-text-tertiary hover:text-fp-text-primary
                      hover:bg-fp-surface transition-colors
                    "
                                    >
                                        {isCopied
                                            ? <Check className="w-3.5 h-3.5 text-fp-accent" />
                                            : <Copy className="w-3.5 h-3.5" />
                                        }
                                    </button>

                                    {/* Email client */}
                                    <a
                                        href={`mailto:${client.email}`}
                                        title="Email client"
                                        className="
                      w-7 h-7 flex items-center justify-center rounded-md
                      text-fp-text-tertiary hover:text-fp-text-primary
                      hover:bg-fp-surface transition-colors
                    "
                                    >
                                        <Mail className="w-3.5 h-3.5" />
                                    </a>

                                    {/* Open project */}
                                    <Link
                                        href={`/dashboard/projects/${client.project.id}`}
                                        title="Open project"
                                        className="
                      w-7 h-7 flex items-center justify-center rounded-md
                      text-fp-text-tertiary hover:text-fp-text-primary
                      hover:bg-fp-surface transition-colors
                    "
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>

                                </div>
                            </div>

                            {/* ── Mobile card (<lg) ───────────────────────────────────── */}
                            {/* Simplified layout: avatar, name/project, status, then */}
                            {/* a second line with activity + revenue + copy button.    */}
                            <div
                                className={`
                  lg:hidden flex items-start gap-3 px-4 py-4
                  transition-colors hover:bg-fp-surface/30 ${rowBorder}
                `}
                            >
                                <Avatar name={client.name} />

                                <div className="flex-1 min-w-0">

                                    {/* Row 1: name + status badge */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-fp-text-primary truncate leading-snug">
                                                {client.name}
                                            </p>
                                            <p className="text-[11px] text-fp-text-tertiary truncate leading-snug mt-0.5">
                                                {client.project.name}
                                            </p>
                                        </div>
                                        <StatusBadge status={client.project.status} />
                                    </div>

                                    {/* Row 2: activity dot + revenue + copy action */}
                                    <div className="flex items-center gap-3 mt-2.5">

                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} />
                                            <span className="text-xs text-fp-text-tertiary">{actLabel}</span>
                                        </div>

                                        {paid > 0 && (
                                            <span className="text-xs font-medium text-fp-text-secondary tabular-nums">
                                                {money(paid, currency)}
                                            </span>
                                        )}

                                        {/* Copy portal link — always visible on mobile (no hover) */}
                                        <button
                                            onClick={() => handleCopy(client)}
                                            className="ml-auto flex items-center gap-1.5 text-xs text-fp-text-tertiary hover:text-fp-text-primary transition-colors"
                                        >
                                            {isCopied
                                                ? <><Check className="w-3 h-3 text-fp-accent" /><span className="text-fp-accent">Copied</span></>
                                                : <><Copy className="w-3 h-3" /><span>Copy link</span></>
                                            }
                                        </button>

                                    </div>
                                </div>
                            </div>

                        </div>
                    )
                })}
            </div>

            {/* ── Row count ─────────────────────────────────────────────────────── */}
            {/* Only shown when search is active — orients user when results are filtered */}
            {search.trim() && filtered.length > 0 && (
                <p className="text-xs text-fp-text-tertiary mt-2.5 text-right">
                    {filtered.length} of {clients.length} client{clients.length !== 1 ? 's' : ''}
                </p>
            )}

        </div>
    )
}