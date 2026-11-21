// components/portal/PortalShell.jsx
// App frame for the portal: a dark sidebar on desktop, a top bar and bottom tab
// bar on phones. Each area of the portal is its own screen, so the client moves
// between them instead of scrolling past everything.
//
// Screens are rendered once by the server (PortalView) and passed in as `views`.
// They all stay mounted and only the active one is shown, so a half-written
// answer survives a trip to another screen. The active screen is mirrored in
// the URL hash (#timeline) so links and the back button work.
'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ClipboardList, FolderOpen, LayoutDashboard, ListChecks, Mail, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'

const ICONS = {
  overview: LayoutDashboard,
  timeline: ListChecks,
  requests: ClipboardList,
  files: FolderOpen,
  invoices: Receipt,
}

const PortalViewContext = createContext({ view: 'overview', setView: () => {} })

// Lets any client component inside a screen jump to another one.
export function usePortalView() {
  return useContext(PortalViewContext)
}

const darkFocus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fp-portal-ink-accent'
const lightFocus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fp-portal-accent-strong'

function Avatar({ name, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fp-portal-accent font-display text-lg font-semibold text-white',
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  )
}

function CountBadge({ count, className = '' }) {
  if (!count) return null
  return (
    <span
      className={cn(
        'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none',
        className,
      )}
    >
      {count}
      <span className="sr-only"> need attention</span>
    </span>
  )
}

export default function PortalShell({ navItems, views, identity, project }) {
  const ids = useMemo(() => navItems.map((item) => item.id), [navItems])
  const [view, setViewState] = useState(ids[0])
  const headingRef = useRef(null)
  const mounted = useRef(false)

  // Open the screen named in the URL hash, and follow the back/forward buttons.
  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.slice(1)
      setViewState(ids.includes(id) ? id : ids[0])
    }
    fromHash()
    window.addEventListener('popstate', fromHash)
    return () => window.removeEventListener('popstate', fromHash)
  }, [ids])

  // After a navigation, start at the top and announce the new screen.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    window.scrollTo(0, 0)
    headingRef.current?.focus({ preventScroll: true })
  }, [view])

  const setView = useCallback(
    (id) => {
      if (!ids.includes(id)) return
      if (window.location.hash !== `#${id}`) window.history.pushState(null, '', `#${id}`)
      setViewState(id)
    },
    [ids],
  )

  const current = navItems.find((item) => item.id === view) ?? navItems[0]
  const name = identity.freelancerName
  const contactHref = identity.freelancerEmail ? `mailto:${identity.freelancerEmail}` : null

  const onNavClick = (e, id) => {
    // Let modified clicks (new tab) use the plain hash link.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    setView(id)
  }

  return (
    <PortalViewContext.Provider value={{ view, setView }}>
      <div className="fp-portal-theme min-h-dvh bg-fp-portal-bg font-body text-fp-portal-text-primary lg:flex">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-fp-portal-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-fp-pop"
        >
          Skip to content
        </a>

        {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
        <aside className="hidden bg-fp-portal-ink text-fp-portal-ink-text lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-72 lg:shrink-0 lg:flex-col">
          <div className="flex items-center gap-3 px-6 pt-7">
            <Avatar name={name} />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="text-xs text-fp-portal-ink-muted">Client portal</p>
            </div>
          </div>

          <div className="mx-4 mt-7 rounded-lg bg-white/3 p-4 ring-1 ring-white/5">
            <p className="text-xs font-semibold uppercase tracking-widest text-fp-portal-ink-muted">Project</p>
            <p className="mt-1.5 font-display text-lg font-medium leading-snug">{project.name}</p>
            <p className="mt-3 flex items-center gap-2 text-xs font-medium text-fp-portal-ink-muted">
              <span
                aria-hidden="true"
                className={cn(
                  'h-2 w-2 rounded-full',
                  project.statusTone === 'success' ? 'bg-fp-portal-ink-success' : 'bg-fp-portal-ink-accent',
                )}
              />
              {project.statusLabel}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div
                role="progressbar"
                aria-label="Overall project progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={project.percentage}
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"
              >
                <div
                  className="h-full rounded-full bg-fp-portal-ink-accent"
                  style={{ width: `${Math.max(project.percentage, 3)}%` }}
                />
              </div>
              <span className="text-xs font-semibold tabular-nums">{project.percentage}%</span>
            </div>
          </div>

          <nav aria-label="Portal" className="mt-6 flex-1 overflow-y-auto px-3">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const Icon = ICONS[item.id]
                const active = view === item.id
                return (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      onClick={(e) => onNavClick(e, item.id)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-150',
                        darkFocus,
                        active
                          ? 'bg-fp-portal-accent/20 text-white'
                          : 'text-fp-portal-ink-muted hover:bg-white/5 hover:text-fp-portal-ink-text',
                      )}
                    >
                      {active && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-2.5 left-0 w-1 rounded-r-full bg-fp-portal-ink-accent"
                        />
                      )}
                      <Icon
                        className={cn('h-[18px] w-[18px] shrink-0', active && 'text-fp-portal-ink-accent')}
                        aria-hidden="true"
                      />
                      <span className="flex-1">{item.label}</span>
                      <CountBadge count={item.badge} className="bg-fp-portal-ink-accent text-fp-portal-ink" />
                    </a>
                  </li>
                )
              })}
            </ul>
          </nav>

          {contactHref && (
            <div className="p-4">
              <a
                href={contactHref}
                className={cn(
                  'flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold text-fp-portal-ink-text transition-colors hover:bg-white/15',
                  darkFocus,
                )}
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Contact {name.split(' ')[0]}
              </a>
            </div>
          )}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* ── Phone top bar ─────────────────────────────────────────────── */}
          <header className="sticky top-0 z-30 border-b border-fp-portal-border bg-fp-portal-surface/90 backdrop-blur lg:hidden">
            <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
              <Avatar name={name} className="h-9 w-9 text-base" />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-semibold text-fp-portal-text-primary">{project.name}</p>
                <p className="truncate text-xs text-fp-portal-text-muted">From {name}</p>
              </div>
              {contactHref && (
                <a
                  href={contactHref}
                  aria-label={`Email ${name}`}
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-fp-portal-border text-fp-portal-text-primary transition-colors hover:bg-fp-portal-raised',
                    lightFocus,
                  )}
                >
                  <Mail className="h-[18px] w-[18px]" aria-hidden="true" />
                </a>
              )}
            </div>
          </header>

          <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
            <div className="mb-5 lg:mb-6">
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="font-display text-2xl font-medium tracking-tight text-fp-portal-text-primary outline-none sm:text-[28px]"
              >
                {current.title}
              </h1>
              <p className="mt-1 text-sm text-fp-portal-text-secondary">{current.description}</p>
            </div>

            {navItems.map((item) => (
              <section key={item.id} id={`screen-${item.id}`} aria-label={item.title} hidden={view !== item.id}>
                {views[item.id]}
              </section>
            ))}
          </main>

          <footer className="px-4 pb-28 text-center text-xs text-fp-portal-text-muted sm:px-6 lg:pb-8">
            This private link was created for {identity.clientName}. Please don&apos;t share it.
          </footer>
        </div>

        {/* ── Phone tab bar ───────────────────────────────────────────────── */}
        <nav
          aria-label="Portal"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-fp-portal-border bg-fp-portal-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        >
          <ul className="mx-auto grid max-w-xl grid-cols-5">
            {navItems.map((item) => {
              const Icon = ICONS[item.id]
              const active = view === item.id
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => onNavClick(e, item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                      lightFocus,
                      active ? 'text-fp-portal-accent-strong' : 'text-fp-portal-text-secondary',
                    )}
                  >
                    <span
                      className={cn(
                        'relative flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                        active && 'bg-fp-portal-accent/10',
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                      <CountBadge
                        count={item.badge}
                        className="absolute -right-0.5 -top-1 bg-fp-portal-accent text-white"
                      />
                    </span>
                    {item.label}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </PortalViewContext.Provider>
  )
}
