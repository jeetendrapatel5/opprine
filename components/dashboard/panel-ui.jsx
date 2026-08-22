// components/dashboard/panel-ui.jsx
//
// Extracted from app/dashboard/projects/[id]/page.jsx, where these were
// originally defined as local, unexported functions. Pulled out here so
// any new dashboard page can reuse the exact same "section with a
// count badge" and "bordered card with a label header" patterns instead
// of re-implementing them — one definition, not N copies to keep in
// sync by hand.
//
// NOTE: the project detail page still has its own local copies (not
// touched here, to avoid changing a file that wasn't part of this
// task) — worth pointing that page at this shared file too, next time
// it's edited.

export function SectionHeader({ title, badge, trailing }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <h2 className="text-sm font-semibold text-fp-text-primary">{title}</h2>
        {badge && (
          <span className="text-[10px] font-semibold text-fp-text-tertiary bg-fp-raised border border-fp-border px-2 py-0.5 rounded-full tabular-nums">
            {badge}
          </span>
        )}
      </div>
      {trailing && (
        <div className="flex items-center gap-2">{trailing}</div>
      )}
    </div>
  )
}

export function PanelCard({ label, children }) {
  return (
    <div className="bg-fp-surface border border-fp-border rounded-xl overflow-hidden">
      {label && (
        <div className="px-4 py-3 border-b border-fp-border">
          <p className="text-[10px] font-bold text-fp-text-tertiary uppercase tracking-widest">
            {label}
          </p>
        </div>
      )}
      {children}
    </div>
  )
}