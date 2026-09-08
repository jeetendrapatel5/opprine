// app/api/projects/[id]/members/[userId]/route.js
//
// DELETE — unstaff a user from this project. PROJECT_MANAGER only.
//
// Mirrors DELETE /api/workspace/invites/[id]/route.js: auth check,
// then hand off straight to the lib function that does the real work.
// removeProjectMember (lib/project.js) already checks the requester's
// own PROJECT_MANAGER-or-above access internally, so — same reasoning
// as revokeInvite not needing a redundant workspace-scope check — this
// route doesn't duplicate a role check of its own.
//
// URL shape differs from the invites route on purpose: WorkspaceInvite
// has its own row id plus an implicit "current workspace" from the
// session, so DELETE /invites/[id] is enough on its own. ProjectMember
// has no equivalent "current project", and removeProjectMember's
// signature is (projectId, targetUserId) rather than a ProjectMember
// row id — so both have to come from the URL: [id] (project) and
// [userId] (the person being unstaffed).

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { removeProjectMember } from '@/lib/project'
import { handleApiError } from '@/lib/http-errors'

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId, userId: targetUserId } = await params

    // removeProjectMember throws ForbiddenError if the caller isn't
    // PROJECT_MANAGER-or-above, NotFoundError if the target isn't
    // actually staffed on this project — handleApiError turns both
    // into the right status code, same as everywhere else.
    //
    // No self-removal block, unlike workspace's removeMember(). A
    // PROJECT_MANAGER removing themselves doesn't orphan the project
    // the way removing the last workspace OWNER would — OWNER/ADMIN
    // still get implicit PROJECT_MANAGER-equivalent access even with
    // zero ProjectMember rows (see requireProjectMembership's fallback
    // in lib/project.js). Flag it back if you want self-removal blocked
    // here too.
    await removeProjectMember({
      requestingUserId: session.user.id,
      targetUserId,
      projectId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}