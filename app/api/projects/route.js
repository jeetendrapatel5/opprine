// Real path: app/api/projects/route.js  (POST)

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

    // Step 5 — Check limits, create the project, AND auto-stage the
    // creator as PROJECT_MANAGER on it — all inside one transaction,
    // protected by the same advisory lock as before.
    const project = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${workspaceId}))`

      const projectCheck = await assertWithinLimit(workspaceId, 'maxProjects', tx)
      if (!projectCheck.allowed) {
        throw new LimitExceededError(projectCheck.reason)
      }

      const clientCheck = await assertWithinLimit(workspaceId, 'maxClients', tx)
      if (!clientCheck.allowed) {
        throw new LimitExceededError(clientCheck.reason)
      }

      const created = await tx.project.create({
        data: {
          name,
          description: description || null,
          userId: session.user.id, // kept: records who created it
          workspaceId,             // the actual owner for billing/limits
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

      // NEW — auto-stage the creator as PROJECT_MANAGER on their own
      // new project (per your call: yes, auto-stage).
      //
      // Deliberately NOT calling addProjectMember() here. That function
      // requires the REQUESTER to already have PROJECT_MANAGER-or-above
      // access on the project before it lets them add anyone (see
      // requireProjectMembership + requireProjectRole inside it in
      // lib/project.js). Right here, the project has zero ProjectMember
      // rows and the creator might only be a workspace MEMBER, not
      // OWNER/ADMIN — so addProjectMember() would throw ForbiddenError
      // on itself. Nobody has authority on a project that was only
      // just created; that's exactly the bootstrap gap this line fills.
      //
      // Same reasoning as createWorkspaceForUser() in workspace.js
      // creating the first WorkspaceMember row directly rather than
      // routing through a permission-gated helper. The one precondition
      // addProjectMember() would otherwise check — target user must
      // already be a WorkspaceMember of this workspace — is already
      // satisfied, since requireWorkspaceMembership() above confirmed it.
      await tx.projectMember.create({
        data: {
          projectId: created.id,
          userId: session.user.id,
          role: 'PROJECT_MANAGER',
        },
      })

      return created
    })

    return NextResponse.json(project, { status: 201 })

  } catch (error) {
    return handleApiError(error)
  }
}