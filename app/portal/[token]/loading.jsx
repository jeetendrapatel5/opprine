// app/portal/[token]/loading.jsx
// Shown while the portal's server data loads. Mirrors the real layout (sidebar,
// hero, key figures) so the page doesn't jump when content arrives.

function Block({ className = '' }) {
  return <div aria-hidden="true" className={`rounded-xl bg-fp-portal-border/60 motion-safe:animate-pulse ${className}`} />
}

export default function PortalLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="fp-portal-theme min-h-dvh bg-fp-portal-bg font-body text-fp-portal-text-primary lg:flex"
    >
      <span className="sr-only">Loading your project</span>

      <aside className="hidden bg-fp-portal-ink lg:block lg:h-dvh lg:w-72 lg:shrink-0">
        <div className="space-y-6 p-6">
          <div className="h-10 w-40 rounded-xl bg-white/10 motion-safe:animate-pulse" />
          <div className="h-32 rounded-2xl bg-white/5 motion-safe:animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-11 rounded-xl bg-white/5 motion-safe:animate-pulse" />
            ))}
          </div>
        </div>
      </aside>

      <div className="mx-auto w-full max-w-6xl flex-1 space-y-5 px-4 py-8 sm:px-6 lg:px-10">
        <Block className="h-8 w-48" />
        <div className="grid gap-5 lg:grid-cols-12">
          <Block className="h-56 rounded-2xl lg:col-span-4 lg:col-start-9 lg:row-start-1" />
          <Block className="h-72 rounded-2xl lg:col-span-8 lg:col-start-1 lg:row-start-1" />
        </div>
        <Block className="h-24 rounded-2xl" />
        <Block className="h-64 rounded-2xl" />
      </div>
    </div>
  )
}
