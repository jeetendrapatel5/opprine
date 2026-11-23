// app/portal/[token]/not-found.jsx
// Shown when a magic token matches no client: an expired or mistyped link, a
// replaced link, or a deleted project. Stays in the light portal theme and
// keeps the tone human rather than technical.

import { Link2Off } from 'lucide-react'
import { Card } from '@/components/portal/ui'

export default function PortalNotFound() {
  return (
    <main className="fp-portal-theme flex min-h-screen items-center justify-center bg-fp-portal-bg p-6 font-body">
      <Card className="w-full max-w-md p-8 text-center sm:p-10">
        <span
          aria-hidden="true"
          className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-fp-portal-raised text-fp-portal-text-secondary"
        >
          <Link2Off className="h-6 w-6" />
        </span>

        <h1 className="font-display text-2xl font-medium tracking-tight text-fp-portal-text-primary">Link not found</h1>

        <p className="mt-3 text-sm leading-relaxed text-fp-portal-text-secondary">
          This portal link is not valid or may have expired. Please ask your developer to send you the correct link.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-fp-portal-text-muted">
          Links can also stop working when a newer one has been sent, so check your inbox for the latest email.
        </p>
      </Card>
    </main>
  )
}
