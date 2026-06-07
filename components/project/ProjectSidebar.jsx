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

function activityDotClass(lastViewedAt) {
  if (!lastViewedAt) return 'bg-fp-border'

  const hoursSince = (Date.now() - new Date(lastViewedAt).getTime()) / 3600000
  if (hoursSince < 24) return 'bg-fp-success'
  return 'bg-fp-warning'
}

function SectionLabel({ icon: Icon, children }) {
  return (
    <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-fp-text-tertiary">
      <Icon className="h-3 w-3" />
      {children}
    </p>
  )
}

export default function ProjectSidebar({ project, portalLink }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyTimeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  const hasClient = Boolean(project?.client)
  const lastViewedText = timeAgo(project?.client?.lastViewedAt)
  const dotClass = activityDotClass(project?.client?.lastViewedAt)

  const canCopyPortalLink = Boolean(hasClient && portalLink && portalLink !== '#')

  const copyPortalLink = async (e) => {
    e.stopPropagation()
    if (!canCopyPortalLink || !navigator?.clipboard) return

    try {
      await navigator.clipboard.writeText(portalLink)
      setCopied(true)

      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch {
      setCopied(false)
    }
  }

  const openPortalPreview = (e) => {
    e.stopPropagation()
  }

  return (
    <div className="overflow-hidden rounded-xl bg-fp-surface">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="project-sidebar-panel"
        className="flex w-full items-center cursor-pointer justify-between gap-3 px-5 py-4 text-left transition-colors duration-150 hover:bg-fp-raised/60"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-fp-text-tertiary">
              <User className="h-3 w-3" />
              Client Overview
            </span>
          </div>

          <div className="mt-3 min-w-0">
            {hasClient ? (
              <p className="truncate text-sm font-[poppins] text-fp-text-primary">
                {project.client.name}
              </p>
            ) : (
              <p className="text-sm font-semibold text-fp-text-secondary">
                No client assigned
              </p>
            )}

            <p className="mt-0.5 text-xs text-fp-text-tertiary">
              {hasClient
                ? lastViewedText
                  ? `Last portal activity: ${lastViewedText}`
                  : 'Portal not opened yet'
                : 'Client details will appear here'}
            </p>
          </div>
        </div>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-fp-text-tertiary transition-transform duration-300 ${
            open ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>

      <div
        id="project-sidebar-panel"
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-fp-border px-5 py-4">
            <SectionLabel icon={User}>Client</SectionLabel>
            {hasClient ? (
              <div>
                <p className="text-sm font-semibold leading-snug text-fp-text-primary">
                  {project.client.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-fp-text-tertiary">
                  {project.client.email}
                </p>
              </div>
            ) : (
              <p className="text-sm italic text-fp-text-tertiary">
                No client assigned.
              </p>
            )}
          </div>

          {hasClient && (
            <>
              <div className="border-t border-fp-border px-5 py-4">
                <SectionLabel icon={Eye}>Portal Activity</SectionLabel>
                <div className="flex items-start gap-2.5">
                  <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
                  <div>
                    {lastViewedText ? (
                      <>
                        <p className="text-sm font-medium leading-snug text-fp-text-primary">
                          Viewed {lastViewedText}
                        </p>
                        <p className="mt-0.5 text-xs text-fp-text-tertiary">
                          {new Date(project.client.lastViewedAt).toLocaleDateString(
                            'en-GB',
                            {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium leading-snug text-fp-text-secondary">
                          Portal not opened yet
                        </p>
                        <p className="mt-0.5 text-xs text-fp-text-tertiary">
                          Share the magic link below
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-fp-border px-5 py-4">
                <SectionLabel icon={Link2}>Client Portal</SectionLabel>
                <p className="mb-3 text-xs leading-relaxed text-fp-text-tertiary">
                  Passwordless link. Your client needs no account.
                </p>

                <button
                  type="button"
                  onClick={copyPortalLink}
                  disabled={!canCopyPortalLink}
                  className={`
                    flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold
                    transition-all duration-200
                    disabled:cursor-not-allowed disabled:opacity-40
                    ${
                      copied
                        ? 'border border-fp-success/30 bg-fp-success/10 text-fp-success'
                        : 'bg-fp-accent text-fp-base hover:bg-fp-accent-hover'
                    }
                  `}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Magic Link
                    </>
                  )}
                </button>

                <a
                  href={portalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={openPortalPreview}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-fp-text-tertiary transition-colors duration-150 hover:text-fp-text-secondary"
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