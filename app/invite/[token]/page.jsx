// app/invite/[token]/page.jsx
//
// Public route (no layout auth-gate should apply here — this is the
// ONE dashboard-adjacent page a logged-out person is meant to reach).
//
// Calls getInviteByToken directly (lib/invites.js) rather than fetching
// our own GET /api/invites/[token] — same reasoning as the Team page:
// a Server Component doing a self-fetch over HTTP to its own API is an
// unnecessary round trip when it can call the same server-side function
// directly.

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getInviteByToken } from '@/lib/invites'
import Link from 'next/link'
import AcceptInviteButton from '@/components/invite/AcceptInviteButton'

export default async function InvitePage({ params }) {
  const { token } = await params

  const [invite, session] = await Promise.all([
    getInviteByToken(token),
    getServerSession(authOptions),
  ])

  if (!invite) {
    return (
      <InviteShell
        title="Invite not found"
        description="This link doesn't match an invite. Double-check it, or ask whoever invited you to send a new one."
      />
    )
  }

  if (invite.status === 'REVOKED') {
    return (
      <InviteShell
        title="Invite revoked"
        description="This invite was cancelled. Ask the workspace owner to send a new one if you still want to join."
      />
    )
  }

  if (invite.status === 'ACCEPTED') {
    return (
      <InviteShell
        title="Already used"
        description="This invite has already been accepted."
        primaryHref="/dashboard"
        primaryLabel="Go to dashboard"
      />
    )
  }

  if (invite.status === 'EXPIRED') {
    return (
      <InviteShell
        title="Invite expired"
        description="This link is more than 24 hours old. Ask whoever invited you to send a new one."
      />
    )
  }

  // Only remaining status is 'PENDING' — the actually-usable case.

  // FLAGGED: acceptInvite (lib/invites.js) does NOT check that the
  // logged-in user's email matches invite.email — possessing the token
  // is treated as sufficient, the same trust model as the
  // Client.magicToken links elsewhere in this app. This banner is a
  // heads-up only, not a hard block — accepting still works either way.
  // Tell me if you'd rather this be enforced (rejected) on the backend
  // instead of just flagged here.
  const emailMismatch =
    session?.user?.email && session.user.email.toLowerCase() !== invite.email.toLowerCase()

  return (
    <div className="min-h-screen flex items-center justify-center bg-fp-base px-4">
      <div className="w-full max-w-sm bg-fp-surface border border-fp-border rounded-xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-fp-accent/15 border border-fp-accent/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-lg font-bold text-fp-accent">
            {invite.workspaceName?.[0]?.toUpperCase() ?? '?'}
          </span>
        </div>

        <h1 className="text-lg font-semibold text-fp-text-primary">Join {invite.workspaceName}</h1>
        <p className="text-sm text-fp-text-secondary mt-1.5">
          {invite.inviterName ?? 'Someone'} invited you as {invite.role === 'ADMIN' ? 'an Admin' : 'a Member'}.
        </p>

        {!session && (
          <div className="mt-6 space-y-2">
            {/* FLAGGED: relies on your signup FORM (not the API route —
                the actual client-side page) reading these query params
                and passing inviteToken through when it calls
                POST /api/auth/signup. I haven't seen that file — see
                the chat message after this code. */}
            <Link
              href={`/signup?inviteToken=${token}&email=${encodeURIComponent(invite.email)}`}
              className="w-full inline-flex items-center justify-center h-9 px-4 rounded-lg bg-fp-accent text-black text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Create an account
            </Link>
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
              className="w-full inline-flex items-center justify-center h-9 px-4 rounded-lg bg-fp-surface border border-fp-border text-fp-text-secondary hover:text-fp-text-primary hover:border-fp-border/80 transition-colors text-sm font-medium"
            >
              I already have an account
            </Link>
          </div>
        )}

        {session && (
          <div className="mt-6">
            {emailMismatch && (
              <p className="text-xs text-fp-warning mb-3 leading-relaxed">
                You're logged in as {session.user.email}, but this invite was sent to {invite.email}.
                You can still accept it with your current account.
              </p>
            )}
            <AcceptInviteButton token={token} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── InviteShell — the "can't accept" states (not found / revoked /
// expired / already used) all share this exact same layout, just with
// different text. One component instead of four near-identical blocks.

function InviteShell({ title, description, primaryHref = '/', primaryLabel = 'Back to home' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-fp-base px-4">
      <div className="w-full max-w-sm bg-fp-surface border border-fp-border rounded-xl p-6 text-center">
        <h1 className="text-lg font-semibold text-fp-text-primary">{title}</h1>
        <p className="text-sm text-fp-text-secondary mt-1.5">{description}</p>
        <Link
          href={primaryHref}
          className="mt-6 inline-flex items-center justify-center h-9 px-4 rounded-lg bg-fp-surface border border-fp-border text-fp-text-secondary hover:text-fp-text-primary hover:border-fp-border/80 transition-colors text-sm font-medium"
        >
          {primaryLabel}
        </Link>
      </div>
    </div>
  )
}