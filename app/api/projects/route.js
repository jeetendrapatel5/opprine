import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { assertWithinLimit } from '@/lib/billing/entitlements'
import { requireWorkspaceMembership } from '@/lib/workspace'
import { LimitExceededError } from '@/lib/errors'
import { handleApiError } from '@/lib/http-errors'

export async function POST(request) {
  try {
    // Step 1 — Make sure user is logged in
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'You must be logged in' },
        { status: 401 }
      )
    }

    // Step 2 — Read the request body
    const body = await request.json()
    const { name, description, clientName, clientEmail } = body

    // Step 3 — Validate required fields
    if (!name || !clientName || !clientEmail) {
      return NextResponse.json(
        { error: 'Name, client name and client email are required' },
        { status: 400 }
      )
    }

    // Step 4 — Find which workspace this user belongs to.
    // Throws NotFoundError (-> 404, via handleApiError) if somehow
    // missing — see the signup-flow gap flagged in chat.
    const { workspaceId } = await requireWorkspaceMembership(session.user.id)

    // Step 5 — Check limits AND create the project, inside one
    // transaction, protected by an advisory lock scoped to this
    // workspace.
    //
    // Why the lock: without it, two simultaneous requests could both
    // read "1 of 2 projects used, allowed" and both insert, landing at
    // 3 projects on a 2-project plan. pg_advisory_xact_lock forces any
    // other transaction trying to create a project for the SAME
    // workspace to wait until this one finishes — so the second request
    // always sees the first one's result before deciding. The lock is
    // released automatically when the transaction ends (commit OR
    // rollback), so a failed request never leaves things stuck.
    const project = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${workspaceId}))`

      // Pass `tx` (not the global prisma) so this count is read through
      // the SAME locked connection — see the entitlements.js change.
      const projectCheck = await assertWithinLimit(workspaceId, 'maxProjects', tx)
      if (!projectCheck.allowed) {
        throw new LimitExceededError(projectCheck.reason)
      }

      // This route always creates exactly one client alongside the
      // project (1:1 relationship in this app), so a client-limit check
      // matters too — e.g. if a future plan ever sets maxClients lower
      // than maxProjects.
      const clientCheck = await assertWithinLimit(workspaceId, 'maxClients', tx)
      if (!clientCheck.allowed) {
        throw new LimitExceededError(clientCheck.reason)
      }

      return tx.project.create({
        data: {
          name,
          description: description || null,
          userId: session.user.id, // kept: records who created it
          workspaceId,             // NEW: the actual owner for billing/limits
          githubWebhookSecret: crypto.randomBytes(32).toString('hex'),
          client: {
            create: {
              name: clientName,
              email: clientEmail.toLowerCase(),
            },
          },
        },
        include: {
          client: true,
        },
      })
    })

    return NextResponse.json(project, { status: 201 })

  } catch (error) {
    return handleApiError(error)
  }
}