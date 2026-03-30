// components/project/ProjectSidebar.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The right-column sidebar. Three jobs:
//   1. Show client details (who is this project for?)
//   2. Show client portal activity (did they open it? when?)
//   3. Provide the portal magic link copy button
//
// Psychology:
// - Client activity ("viewed 2h ago" vs "never opened") is the variable
//   reward signal. The freelancer checks this like email. Green dot = engaged
//   client. Amber = need to follow up. Gray = link hasn't been shared yet.
// - The "Copy Magic Link" button is the most important action in the sidebar.
//   It's the primary button spec: bg-fp-accent, full width, prominent.
// - Client name in its own box with a slightly raised surface signals
//   "this is a person, not just data".
// ─────────────────────────────────────────────────────────────────────────────
'use client'

import { useState } from 'react'
import { Copy, CheckCircle2, ExternalLink, User, Eye, Activity, Link2 } from 'lucide-react'

function timeAgo(date) {
  if (!date) return null
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60)    return 'just now'
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  const days = Math.floor(seconds / 86400)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

// Returns a Tailwind class for the activity dot color based on recency.
// Green = viewed today. Amber = viewed but stale. Gray = never opened.
function activityDotClass(lastViewedAt) {
  if (!lastViewedAt) return 'bg-fp-border'
  const hoursSince = (new Date() - new Date(lastViewedAt)) / (1000 * 60 * 60)
  if (hoursSince < 24) return 'bg-fp-success'
  return 'bg-fp-warning'
}

// Section heading — small label used consistently throughout the sidebar
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

  const lastViewedText   = timeAgo(project.client?.lastViewedAt)
  const dotClass         = activityDotClass(project.client?.lastViewedAt)

  return (
    <div className="bg-fp-surface border border-fp-border rounded-xl p-5 space-y-5">

      {/* ── Client info ─────────────────────────────────────────────────── */}
      <div>
        <SectionLabel icon={User}>Client</SectionLabel>
        {project.client ? (
          // Slight surface raise for the client info box — "this is a person"
          <div className="bg-fp-raised border border-fp-border rounded-lg p-3">
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

      <div className="border-t border-fp-border" />

      {/* ── Client activity ─────────────────────────────────────────────── */}
      {/* Only shown if a client exists — meaningless without one */}
      {project.client && (
        <>
          <div>
            <SectionLabel icon={Eye}>Portal Activity</SectionLabel>
            <div className="flex items-start gap-2.5">
              {/* Activity dot — the at-a-glance engagement signal */}
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
          <div className="border-t border-fp-border" />
        </>
      )}

      {/* ── Portal link ─────────────────────────────────────────────────── */}
      <div>
        <SectionLabel icon={Link2}>Client Portal</SectionLabel>
        <p className="text-fp-text-tertiary text-xs mb-3 leading-relaxed">
          A secure, passwordless link. Your client doesn't need an account.
        </p>

        {/* Primary action button — the most important thing in the sidebar */}
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
          {copied ? (
            <><CheckCircle2 className="w-4 h-4" /> Copied!</>
          ) : (
            <><Copy className="w-4 h-4" /> Copy Magic Link</>
          )}
        </button>

        {/* Secondary: open the portal yourself to preview it */}
        {project.client && (
          <a
            href={portalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="
              mt-2 w-full flex items-center justify-center gap-1.5
              text-xs font-medium text-fp-text-tertiary
              hover:text-fp-text-secondary transition-colors duration-150
              py-1.5
            "
          >
            <ExternalLink className="w-3 h-3" />
            Preview portal
          </a>
        )}
      </div>

    </div>
  )
}