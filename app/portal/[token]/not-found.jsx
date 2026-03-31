// app/portal/[token]/not-found.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Shown when a magic token doesn't match any client in the database.
// Could mean: expired link, wrong link, or the project was deleted.
//
// Portal theme (light) — we're still in the client's world even on error pages.
// The message is human and reassuring, not technical.
// ─────────────────────────────────────────────────────────────────────────────

export default function PortalNotFound() {
  return (
    <div className="min-h-screen bg-fp-portal-bg flex items-center justify-center p-6 font-body">
      <div className="text-center max-w-sm">

        {/* Icon — link broken, visual metaphor */}
        <div className="
          w-14 h-14 rounded-xl bg-fp-portal-surface border border-fp-portal-border
          flex items-center justify-center mx-auto mb-6
        ">
          <span className="text-2xl leading-none">🔗</span>
        </div>

        {/* Heading — Fraunces for the display role */}
        <h1 className="font-display text-2xl font-medium text-fp-portal-text-primary mb-3 tracking-tight">
          Link not found
        </h1>

        <p className="text-fp-portal-text-secondary text-sm leading-relaxed">
          This portal link is not valid or may have expired. Please ask your
          developer to send you the correct link.
        </p>

      </div>
    </div>
  )
}