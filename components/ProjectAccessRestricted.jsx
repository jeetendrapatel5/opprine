import Link from 'next/link'
import { Lock } from 'lucide-react'

// shown when user is in the workspace but not assigned to the project
// no props, no fetching: nothing about the project can leak from here
export default function ProjectAccessRestricted() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-fp-border bg-fp-surface">
        <Lock className="h-5 w-5 text-fp-text-tertiary" aria-hidden="true" />
      </div>

      <h1 className="text-lg font-medium text-fp-text-primary">
        You don&apos;t have access to this project
      </h1>

      <p className="mt-2 text-sm leading-relaxed text-fp-text-secondary">
        It&apos;s part of your workspace, but you haven&apos;t been assigned to it.
        Ask a workspace owner or admin to add you.
      </p>

      <Link
        href="/dashboard"
        className="mt-6 rounded-md text-sm font-medium text-fp-accent hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-fp-accent"
      >
        Back to dashboard
      </Link>
    </div>
  )
}