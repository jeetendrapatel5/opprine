// app/portal/[token]/error.jsx
// Shown when the portal fails to load for a reason other than a bad link (that
// is not-found.jsx). Keeps the tone human and offers a retry; no technical detail.
'use client'

import { TriangleAlert } from 'lucide-react'
import { Button, Card } from '@/components/portal/ui'

export default function PortalError({ reset }) {
  return (
    <main className="fp-portal-theme flex min-h-screen items-center justify-center bg-fp-portal-bg p-6 font-body">
      <Card className="w-full max-w-md p-8 text-center sm:p-10">
        <span
          aria-hidden="true"
          className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-fp-portal-danger/10 text-fp-portal-danger"
        >
          <TriangleAlert className="h-6 w-6" />
        </span>
        <h1 className="font-display text-2xl font-medium tracking-tight text-fp-portal-text-primary">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-fp-portal-text-secondary">
          We couldn&apos;t load your project just now. Please try again in a moment.
        </p>
        <Button variant="primary" onClick={() => reset()} className="mt-6 w-full sm:w-auto">
          Try again
        </Button>
      </Card>
    </main>
  )
}
