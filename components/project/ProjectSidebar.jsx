'use client'

import { useState } from 'react'
import { Copy, CheckCircle2, ExternalLink, User, Eye, Link2 } from 'lucide-react'

function timeAgo(date) {
  if (!date) return null
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60)    return 'just now'
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  const days = Math.floor(seconds / 86400)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

function activityDotClass(lastViewedAt) {
  if (!lastViewedAt) return 'bg-fp-border'
  const hoursSince = (new Date() - new Date(lastViewedAt)) / 3600000
  if (hoursSince < 24) return 'bg-fp-success'
  return 'bg-fp-warning'
}

function SectionLabel({ icon: Icon, children }) {
  return (
    <p className="flex items-center gap-1.5 text-[10px] font-bold text-fp-text-tertiary uppercase tracking-widest mb-3">
      <Icon className="w-3 h-3" />
      {children}
    </p>
  )
}

export default function ProjectSidebar({ project, portalLink }) {
  const [copied, setCopied] = useState(false)

  const copyPortalLink = () => {
    navigator.clipboard.writeText(portalLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const lastViewedText = timeAgo(project.client?.lastViewedAt)
  const dotClass       = activityDotClass(project.client?.lastViewedAt)

  return (
    <div className="bg-fp-surface rounded-xl overflow-hidden">

      {/* ── Client info ── */}
      <div className="px-5 pt-5 pb-4">
        <SectionLabel icon={User}>Client</SectionLabel>
        {project.client ? (
          <div>
            <p className="text-fp-text-primary text-sm font-semibold leading-snug">
              {project.client.name}
            </p>
            <p className="text-fp-text-tertiary text-xs mt-0.5 truncate">
              {project.client.email}
            </p>
          </div>
        ) : (
          <p className="text-fp-text-tertiary text-sm italic">No client assigned.</p>
        )}
      </div>

      {/* ── Client portal activity ── */}
      {project.client && (
        <>
          <div className="border-t border-fp-border px-5 py-4">
            <SectionLabel icon={Eye}>Portal Activity</SectionLabel>
            <div className="flex items-start gap-2.5">
              <div className={`w-2 h-2 rounded-full shrink-0 mt-1 ${dotClass}`} />
              <div>
                {lastViewedText ? (
                  <>
                    <p className="text-fp-text-primary text-sm font-medium leading-snug">
                      Viewed {lastViewedText}
                    </p>
                    <p className="text-fp-text-tertiary text-xs mt-0.5">
                      {new Date(project.client.lastViewedAt).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-fp-text-secondary text-sm font-medium leading-snug">
                      Portal not opened yet
                    </p>
                    <p className="text-fp-text-tertiary text-xs mt-0.5">
                      Share the magic link below
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Portal link — primary CTA of the sidebar ── */}
          {/*
            This was hidden behind ENABLE_CLIENT_PORTAL = false in the original.
            That flag has been removed. The portal link IS the product's value
            proposition — hiding it makes the sidebar feel hollow.
          */}
          <div className="border-t border-fp-border px-5 py-4">
            <SectionLabel icon={Link2}>Client Portal</SectionLabel>
            <p className="text-fp-text-tertiary text-xs mb-3 leading-relaxed">
              Passwordless link. Your client needs no account.
            </p>

            <button
              onClick={copyPortalLink}
              disabled={!project.client}
              className={`
                w-full flex items-center justify-center gap-2
                text-sm font-semibold py-2.5 px-4 rounded-lg
                transition-all duration-200
                disabled:opacity-40 disabled:cursor-not-allowed
                ${copied
                  ? 'bg-fp-success/10 text-fp-success border border-fp-success/30'
                  : 'bg-fp-accent hover:bg-fp-accent-hover text-fp-base'
                }
              `}
            >
              {copied
                ? <><CheckCircle2 className="w-4 h-4" /> Copied!</>
                : <><Copy className="w-4 h-4" /> Copy Magic Link</>
              }
            </button>

            
            <a href={portalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-medium text-fp-text-tertiary hover:text-fp-text-secondary transition-colors duration-150 py-1.5"
            >
              <ExternalLink className="w-3 h-3" />
              Preview portal
            </a>
          </div>
        </>
      )}
    </div>
  )
}