'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Copy,
  CheckCircle2,
  ExternalLink,
  User,
  Eye,
  Link2,
  ChevronDown,
} from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(date) {
  if (!date) return null
  const diffMs = Date.now() - new Date(date).getTime()
  if (Number.isNaN(diffMs)) return null
  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  const days = Math.floor(seconds / 86400)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

// Returns a Tailwind bg color class based on how recently the client was active.
// Green = last 24 h, amber = older, grey = never
function activityDotClass(lastViewedAt) {
  if (!lastViewedAt) return 'bg-fp-border'
  const hoursSince = (Date.now() - new Date(lastViewedAt).getTime()) / 3_600_000
  return hoursSince < 24 ? 'bg-fp-success' : 'bg-fp-warning'
}

// ── Sub-components ─────────────────────────────────────────────────────────

// Tiny uppercase label that prefixes each expanded section
function SectionLabel({ icon: Icon, children }) {
  return (
    <p className="mb-3 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-fp-text-tertiary">
      <Icon className="h-3 w-3" />
      {children}
    </p>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ProjectSidebar({ project, portalLink }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyTimeoutRef = useRef(null)

  // Clear the reset-copied timeout when this component unmounts
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [])

  const hasClient        = Boolean(project?.client)
  const lastViewedText   = timeAgo(project?.client?.lastViewedAt)
  const dotClass         = activityDotClass(project?.client?.lastViewedAt)
  const canCopyPortalLink = Boolean(hasClient && portalLink && portalLink !== '#')

  // Writes the portal link to the clipboard and briefly shows a check mark.
  // e.stopPropagation() prevents the click from also toggling the accordion.
  const copyPortalLink = async (e) => {
    e.stopPropagation()
    if (!canCopyPortalLink || !navigator?.clipboard) return
    try {
      await navigator.clipboard.writeText(portalLink)
      setCopied(true)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-xl bg-fp-surface">

      {/* ── COLLAPSED HEADER ──
          Always visible. Shows: client avatar + activity dot + name + quick-copy button.
          Users can copy the portal link without ever opening the accordion.
      ── */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="project-sidebar-panel"
        className="flex w-full items-center cursor-pointer justify-between gap-3 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-fp-raised/40"
      >
        {/* Left: avatar with activity dot + name */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            {hasClient ? (
              <div className="
                w-7 h-7 rounded-lg bg-fp-raised border border-fp-border
                flex items-center justify-center
                text-xs font-bold text-fp-text-secondary
              ">
                {project.client.name?.[0]?.toUpperCase() ?? 'C'}
              </div>
            ) : (
              <div className="
                w-7 h-7 rounded-lg bg-fp-raised border border-fp-border
                flex items-center justify-center
              ">
                <User className="h-3 w-3 text-fp-text-tertiary" />
              </div>
            )}
            {/* Activity dot anchored to avatar bottom-right */}
            <span
              className={`
                absolute -bottom-0.5 -right-0.5
                w-2 h-2 rounded-full
                border-[1.5px] border-fp-surface
                ${dotClass}
              `}
            />
          </div>

          <div className="min-w-0">
            <p className="text-[9px] font-bold text-fp-text-tertiary uppercase tracking-widest leading-none mb-0.5">
              Client
            </p>
            <p className="text-xs font-semibold text-fp-text-primary truncate leading-none">
              {hasClient ? project.client.name : 'No client assigned'}
            </p>
          </div>
        </div>

        {/* Right: quick-copy icon + chevron */}
        <div className="flex items-center gap-1.5 shrink-0">
          {canCopyPortalLink && (
            <span
              role="button"
              tabIndex={-1}
              onClick={copyPortalLink}
              title={copied ? 'Copied!' : 'Copy magic link'}
              className="
                p-1.5 rounded-md
                text-fp-text-tertiary
                hover:text-fp-accent hover:bg-fp-raised
                transition-colors duration-150
              "
            >
              {copied
                ? <CheckCircle2 className="h-3.5 w-3.5 text-fp-success" />
                : <Copy className="h-3.5 w-3.5" />
              }
            </span>
          )}

          <ChevronDown
            className={`
              h-4 w-4 shrink-0 text-fp-text-tertiary
              transition-transform duration-300
              ${open ? 'rotate-180' : 'rotate-0'}
            `}
          />
        </div>
      </button>

      {/* ── EXPANDED CONTENT ──
          CSS grid trick: animating grid-template-rows from 0fr → 1fr
          gives a smooth height transition without a fixed max-height.
      ── */}
      <div
        id="project-sidebar-panel"
        className={`
          grid transition-[grid-template-rows,opacity] duration-300 ease-in-out
          ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}
        `}
      >
        <div className="overflow-hidden">

          {/* Client details section */}
          <div className="border-t border-fp-border px-4 py-4">
            <SectionLabel icon={User}>Client Details</SectionLabel>
            {hasClient ? (
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-fp-text-primary leading-snug">
                  {project.client.name}
                </p>
                <p className="text-[11px] text-fp-text-tertiary truncate">
                  {project.client.email}
                </p>
              </div>
            ) : (
              <p className="text-xs italic text-fp-text-tertiary">No client assigned.</p>
            )}
          </div>

          {hasClient && (
            <>
              {/* Portal activity section */}
              <div className="border-t border-fp-border px-4 py-4">
                <SectionLabel icon={Eye}>Portal Activity</SectionLabel>
                <div className="flex items-start gap-2.5">
                  <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
                  <div>
                    {lastViewedText ? (
                      <>
                        <p className="text-xs font-medium leading-snug text-fp-text-primary">
                          Viewed {lastViewedText}
                        </p>
                        <p className="mt-0.5 text-[10px] text-fp-text-tertiary">
                          {new Date(project.client.lastViewedAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-medium leading-snug text-fp-text-secondary">
                          Portal not opened yet
                        </p>
                        <p className="mt-0.5 text-[10px] text-fp-text-tertiary">
                          Share the magic link below
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Portal link section */}
              <div className="border-t border-fp-border px-4 py-4">
                <SectionLabel icon={Link2}>Client Portal</SectionLabel>
                <p className="mb-3 text-[11px] leading-relaxed text-fp-text-tertiary">
                  Passwordless link — your client needs no account.
                </p>

                {/* Primary CTA: copy the magic link */}
                <button
                  type="button"
                  onClick={copyPortalLink}
                  disabled={!canCopyPortalLink}
                  className={`
                    flex w-full items-center justify-center gap-2
                    rounded-lg px-4 py-2.5 text-xs font-bold
                    transition-all duration-200
                    disabled:cursor-not-allowed disabled:opacity-40
                    ${copied
                      ? 'border border-fp-success/30 bg-fp-success/10 text-fp-success'
                      : 'bg-fp-accent text-fp-base hover:bg-fp-accent-hover'
                    }
                  `}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Link copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Magic Link
                    </>
                  )}
                </button>

                {/* Secondary: open portal in new tab */}
                <a
                  href={portalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    mt-2 flex w-full items-center justify-center gap-1.5 py-1.5
                    text-[11px] font-medium text-fp-text-tertiary
                    hover:text-fp-text-secondary transition-colors duration-150
                  "
                >
                  <ExternalLink className="h-3 w-3" />
                  Preview portal
                </a>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}