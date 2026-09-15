// app/api/workspace/invites/route.js
//
// POST — create a new invite (or revive a revoked/expired one for the
// same email — see the upsert in lib/invites.js) and email it out.
// OWNER/ADMIN only.
//
// GET — list pending invites for the caller's active workspace. Any
// member can view this (matches GET /api/workspace, which returns the
// full member list to any member, not just OWNER/ADMIN) — only
// SENDING and REVOKING are role-gated, not viewing.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireWorkspaceMembership, requireRole } from '@/lib/workspace'
import { assertWithinLimit } from '@/lib/billing/entitlements'
import { LimitExceededError } from '@/lib/errors'
import { createInvite, listInvites } from '@/lib/invites'
import { handleApiError } from '@/lib/http-errors'

// Roles that can be GRANTED through an invite. OWNER is deliberately
// excluded — handing someone OWNER access should be its own explicit
// action later (e.g. "transfer ownership"), not a side effect of
// filling out an invite form.
// FLAGGED ASSUMPTION: this wasn't one of your three confirmed
// decisions — it's my default. Tell me if OWNER should be invitable.
const INVITABLE_ROLES = ['ADMIN', 'MEMBER']

// Deliberately simple: "has an @ and a . after it." We are NOT trying
// to fully validate email addresses with a regex here — that's a
// famously unwinnable problem (RFC 5322 addresses can be bizarre).
// The email's real validation is that it can actually receive mail,
// which sendInviteEmail() will surface a failure for if it's wrong.
// This check exists purely to reject obvious junk before we touch the
// database at all.
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request) {
  try {
    // Step 1 — must be logged in
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    // Step 2 — read + validate the request body.
    // Matches the pattern in signup/route.ts and projects/route.js:
    // basic shape/presence checks return a 400 directly, right here,
    // rather than being thrown as custom errors — those are reserved
    // for things that depend on DATABASE state (membership, roles,
    // limits), which this isn't yet.
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    const role = typeof body?.role === 'string' ? body.role.trim().toUpperCase() : 'MEMBER'

    if (!email || !LOOKS_LIKE_EMAIL.test(email)) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
    }

    if (!INVITABLE_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Role must be one of: ${INVITABLE_ROLES.join(', ')}` },
        { status: 400 }
      )
    }

    // Step 3 — which workspace, and are they allowed to invite into it?
    const membership = await requireWorkspaceMembership(session.user.id)
    requireRole(membership.role, ['OWNER', 'ADMIN'])

    // Step 4 — fail-fast seat check. This is a UX nicety, NOT the
    // authoritative guard: it only compares the CURRENT member count to
    // the plan limit, so it has no idea how many OTHER invites are
    // already pending. A workspace at 4/5 seats could still pass this
    // check five times in a row for five different emails. The real
    // enforcement — the one that can't be raced — is the
    // advisory-locked check inside acceptInvite (lib/invites.js), which
    // runs at the moment someone actually joins, not at invite time.
    const seatCheck = await assertWithinLimit(membership.workspaceId, 'maxWorkspaceMembers')
    if (!seatCheck.allowed) {
      throw new LimitExceededError(seatCheck.reason)
    }

    // Step 5 — create (or revive) the invite, send the email, AND
    // create the in-app notification. All three of those now happen
    // inside createInvite() itself — see lib/invites.js — not here.
    // This route's only job is auth + validation + calling it.
    const invite = await createInvite(membership.workspaceId, {
      email,
      role,
      invitedByUserId: session.user.id,
    })

    // Deliberately NOT returning invite.token here. The token only
    // needs to exist inside the email that was just sent — echoing it
    // back in the API response would leak it to anything with access to
    // network logs or a browser extension reading responses, for no
    // benefit (the frontend doesn't need it for anything).
    return NextResponse.json(
      {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
      },
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const membership = await requireWorkspaceMembership(session.user.id)
    const invites = await listInvites(membership.workspaceId)

    return NextResponse.json({ invites })
  } catch (error) {
    return handleApiError(error)
  }
}