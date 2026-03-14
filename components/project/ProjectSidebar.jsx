'use client'

import { useState } from 'react'
import { Copy, CheckCircle2, ExternalLink, User, Clock, Activity } from 'lucide-react'

const statusConfig = {
  ACTIVE:    { label: 'Active',    dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  COMPLETED: { label: 'Completed', dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  ON_HOLD:   { label: 'On Hold',   dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
}

export default function ProjectSidebar({ project, portalLink }) {
  const [copied, setCopied] = useState(false)
  const status = statusConfig[project.status] || statusConfig.ACTIVE

  const copyPortalLink = () => {
    navigator.clipboard.writeText(portalLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 space-y-6">
      
      {/* Status Section */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" /> Project Status
        </h3>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${status.bg} ${status.text}`}>
          <div className={`w-2 h-2 rounded-full ${status.dot} shadow-sm`}></div>
          {status.label}
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* Client Info Section */}
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

      {/* Portal Link Action (The Premium Element) */}
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
            <>
              <CheckCircle2 className="w-4 h-4" /> Link Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" /> Copy Magic Link
            </>
          )}
        </button>
      </div>

    </div>
  )
}