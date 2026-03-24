// components/project/ProjectSidebar.jsx
'use client'

import { useState } from 'react'
import { Copy, CheckCircle2, ExternalLink, User, Clock, Activity, Eye } from 'lucide-react'

const statusConfig = {
  ACTIVE:    { label: 'Active',    dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  COMPLETED: { label: 'Completed', dot: 'bg-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-700'    },
  ON_HOLD:   { label: 'On Hold',   dot: 'bg-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-700'   },
}

// Converts a date to "X minutes/hours/days ago" string.
// Returns null if no date is passed — we use that to show "Never opened" instead.
function timeAgo(date) {
  if (!date) return null
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60)    return 'just now'
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  const days = Math.floor(seconds / 86400)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

export default function ProjectSidebar({ project, portalLink }) {
  const [copied, setCopied] = useState(false)
  const status = statusConfig[project.status] || statusConfig.ACTIVE

  const copyPortalLink = () => {
    navigator.clipboard.writeText(portalLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Compute the "last viewed" text once so we can use it in two places below
  // (the text label and the dot color logic)
  const lastViewedText = timeAgo(project.client?.lastViewedAt)

  // We want to visually signal how recent the last view was:
  //   Never opened   → gray dot (neutral, slightly concerning)
  //   Viewed today   → green dot (client is engaged)
  //   Viewed 2+ days → amber dot (client hasn't been back in a while)
  //
  // We determine "today" by checking if lastViewedAt is within the last 24 hours.
  function getActivityDotColor() {
    if (!project.client?.lastViewedAt) return 'bg-gray-300'
    const hoursSince = (new Date() - new Date(project.client.lastViewedAt)) / (1000 * 60 * 60)
    if (hoursSince < 24) return 'bg-emerald-500'
    return 'bg-amber-400'
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 space-y-6">

      {/* ── Status ─────────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" /> Project Status
        </h3>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${status.bg} ${status.text}`}>
          <div className={`w-2 h-2 rounded-full ${status.dot} shadow-sm`} />
          {status.label}
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* ── Client Info ────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <User className="w-3.5 h-3.5" /> Client Details
        </h3>
        {project.client ? (
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-sm font-semibold text-slate-900">{project.client.name}</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{project.client.email}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">No client assigned yet.</p>
        )}
      </div>

      <hr className="border-slate-100" />

      {/* ── Client Activity ────────────────────────────────────────────── */}
      {/* Only show this section if a client exists on the project */}
      {project.client && (
        <>
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Eye className="w-3.5 h-3.5" /> Client Activity
            </h3>

            <div className="flex items-center gap-3">
              {/* Colored dot — green if recent, amber if stale, gray if never */}
              <div className={`w-2 h-2 rounded-full shrink-0 ${getActivityDotColor()}`} />

              <div>
                {lastViewedText ? (
                  <>
                    {/* Client HAS opened the portal */}
                    <p className="text-sm font-medium text-slate-700">
                      Portal viewed {lastViewedText}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {/* Show the exact date+time so the freelancer can cross-reference */}
                      {new Date(project.client.lastViewedAt).toLocaleDateString('en-GB', {
                        day:   'numeric',
                        month: 'short',
                        year:  'numeric',
                        hour:  '2-digit',
                        minute:'2-digit',
                      })}
                    </p>
                  </>
                ) : (
                  <>
                    {/* Client has NEVER opened the portal */}
                    <p className="text-sm font-medium text-slate-700">
                      Client hasn't opened portal yet
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Share the magic link below
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />
        </>
      )}

      {/* ── Portal Link ────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <ExternalLink className="w-3.5 h-3.5" /> Client Portal
        </h3>
        <p className="text-xs text-slate-500 mb-3 leading-relaxed">
          Share this secure, passwordless link with your client to give them access to the portal.
        </p>

        <button
          onClick={copyPortalLink}
          disabled={!project.client}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
            copied
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/10'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {copied ? (
            <><CheckCircle2 className="w-4 h-4" /> Link Copied!</>
          ) : (
            <><Copy className="w-4 h-4" /> Copy Magic Link</>
          )}
        </button>
      </div>

    </div>
  )
}