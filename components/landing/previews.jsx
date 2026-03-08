// ─────────────────────────────────────────────────────────────────────────────
// components/landing/previews.jsx
//
// The four feature mockup cards shown in the Features section.
// These are visual-only — no logic, no state.
//
// TO ADD A NEW PREVIEW:
//   1. Build a new component below (e.g. InvoicePreview)
//   2. Add it to the PREVIEWS map at the bottom
//   3. Add previewKey: 'invoice' to the matching object in data.js FEATURES
//   Features.jsx will render it automatically — no other changes needed.
// ─────────────────────────────────────────────────────────────────────────────
import { WindowChrome } from './ui'

// ── PortalPreview ─────────────────────────────────────────────────────────────
function PortalPreview() {
  const rows = [
    { label: 'Logo Directions',  status: 'In Review', textColor: 'text-amber-400',   bg: 'bg-amber-500/10'   },
    { label: 'Mood Board',       status: 'Done',      textColor: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Brand Guidelines', status: 'Pending',   textColor: 'text-slate-500',   bg: 'bg-white/[0.04]'   },
  ]
  return (
    <div className="bg-[#0d1117] rounded-2xl border border-white/[0.08] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
      <WindowChrome url="portal.freeport.dev/p/luminary" />
      <div className="p-5">
        {/* Client header row */}
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-white/[0.05]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[13px] font-black text-white flex-shrink-0">L</div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[13px] text-slate-100">Luminary Co. Portal</p>
            <p className="text-[11px] text-slate-500">Brand Identity System</p>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">Active</span>
        </div>
        {/* Deliverable rows */}
        {rows.map(r => (
          <div key={r.label} className="flex items-center justify-between py-2.5 border-b border-white/[0.03]">
            <span className="text-[12px] text-slate-400">{r.label}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.textColor} ${r.bg}`}>{r.status}</span>
          </div>
        ))}
        {/* Pay button */}
        <div className="mt-4 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-xl p-3 text-center font-bold text-[13px] text-white">
          Approve &amp; Pay — ₹48,000
        </div>
      </div>
    </div>
  )
}

// ── UpdatesPreview ────────────────────────────────────────────────────────────
function UpdatesPreview() {
  const items = [
    { status: 'Done',        icon: '✅', time: '2h ago',  bg: 'bg-emerald-500/[0.07]', bar: 'border-l-emerald-500/60', text: 'Completed all 3 logo directions and uploaded for review.' },
    { status: 'In Review',   icon: '👀', time: '1d ago',  bg: 'bg-amber-500/[0.07]',   bar: 'border-l-amber-500/60',   text: 'Homepage mockup ready. Awaiting client feedback on the hero section.' },
    { status: 'In Progress', icon: '🔄', time: '3d ago',  bg: 'bg-indigo-500/[0.07]',  bar: 'border-l-indigo-500/60',  text: 'Working on color system and typography scale. ETA: Friday.' },
  ]
  return (
    <div className="bg-[#0d1117] rounded-2xl border border-white/[0.08] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.5)] space-y-2.5">
      {items.map((u, i) => (
        <div key={i} className={`border-l-[3px] rounded-r-xl p-3 ${u.bg} ${u.bar}`}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px]">{u.icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate-400">{u.status}</span>
            <span className="ml-auto text-[10px] text-slate-600">{u.time}</span>
          </div>
          <p className="text-[12px] text-slate-500 leading-[1.7]">{u.text}</p>
        </div>
      ))}
    </div>
  )
}

// ── MilestonesPreview ─────────────────────────────────────────────────────────
function MilestonesPreview() {
  const items = [
    { title: 'Discovery & Strategy',   s: 'DONE'     },
    { title: 'Mood Board & Direction', s: 'DONE'     },
    { title: 'Logo Design',            s: 'ACTIVE'   },
    { title: 'Brand Guidelines PDF',   s: 'PENDING'  },
  ]
  const done = items.filter(m => m.s === 'DONE').length
  return (
    <div className="bg-[#0d1117] rounded-2xl border border-white/[0.08] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-[14px] text-slate-100">Milestones</span>
        <span className="font-bold text-[12px] text-indigo-400">{done}/{items.length}</span>
      </div>
      {/* Progress bar */}
      <div className="h-[3px] bg-white/[0.06] rounded-full mb-5 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      {/* List */}
      {items.map((m, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center w-5 flex-shrink-0">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
              ${m.s === 'DONE'    ? 'border-emerald-500 bg-emerald-500/15' : ''}
              ${m.s === 'ACTIVE'  ? 'border-amber-500 bg-transparent' : ''}
              ${m.s === 'PENDING' ? 'border-white/10 bg-transparent' : ''}
            `}>
              {m.s === 'DONE' && (
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1 4.5L3.2 7L8 2" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
              {m.s === 'ACTIVE' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
            </div>
            {i < items.length - 1 && (
              <div className={`w-0.5 my-1 ${m.s === 'DONE' ? 'bg-emerald-500/20' : 'bg-white/[0.05]'}`} style={{ height: 24 }} />
            )}
          </div>
          <div className="pb-6 pt-0.5">
            <span className={`text-[12px] font-medium ${m.s === 'DONE' ? 'line-through text-slate-700' : 'text-slate-400'}`}>{m.title}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── FilesPreview ──────────────────────────────────────────────────────────────
function FilesPreview() {
  const files = [
    { name: 'Logo_Final_v3.fig',    size: '8.4 MB',  icon: '🎨', ago: '2d ago' },
    { name: 'Brand_Guidelines.pdf', size: '1.2 MB',  icon: '📄', ago: '5d ago' },
    { name: 'Moodboard_R2.zip',     size: '24.8 MB', icon: '🗜️', ago: '1w ago' },
  ]
  return (
    <div className="bg-[#0d1117] rounded-2xl border border-white/[0.08] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
      <div className="flex justify-between items-center mb-4">
        <span className="font-bold text-[14px] text-slate-100">Deliverables</span>
        <div className="bg-gradient-to-r from-indigo-500 to-violet-600 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white flex items-center gap-1">↑ Upload</div>
      </div>
      {files.map((f, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
          <div className="w-9 h-9 bg-white/[0.04] rounded-xl flex items-center justify-center text-base flex-shrink-0">{f.icon}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[12px] text-slate-100 truncate">{f.name}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">{f.size} · {f.ago}</p>
          </div>
          <div className="w-7 h-7 bg-white/[0.04] rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="#475569" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── PREVIEWS MAP ──────────────────────────────────────────────────────────────
// Features.jsx looks up which preview to render using this map.
// Key must match `previewKey` in data.js FEATURES array.
export const PREVIEWS = {
  portal:     <PortalPreview     />,
  updates:    <UpdatesPreview    />,
  milestones: <MilestonesPreview />,
  files:      <FilesPreview      />,
}