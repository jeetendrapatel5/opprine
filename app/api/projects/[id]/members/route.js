// app/api/projects/[id]/members/route.js
//
// POST — staff a user onto this project (or change their role: upsert).
//        addProjectMember checks the caller's manageStaffing itself.
// GET  — list who's staffed. Needs viewRoster (listProjectMembers does
//        no permission check of its own). Also tells the panel whether
//        the caller can manage staffing (canManage), so the UI never has
//        to work out permissions on its own.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireProjectMembership, addProjectMember, listProjectMembers } from '@/lib/project'
import { can } from '@/lib/project-permissions'
import { ForbiddenError } from '@/lib/errors'
import { handleApiError } from '@/lib/http-errors'

// valid ProjectRole values, blocks typo'd/garbage strings reaching prisma
const STAFFABLE_ROLES = ['PROJECT_MANAGER', 'CONTRIBUTOR', 'VIEWER']

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const { id: projectId } = await params

    // shape checks -> 400. anything db-dependent is handled in addProjectMember
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const userId = typeof body?.userId === 'string' ? body.userId.trim() : ''
    const role = typeof body?.role === 'string' ? body.role.trim().toUpperCase() : 'CONTRIBUTOR'

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    if (!STAFFABLE_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Role must be one of: ${STAFFABLE_ROLES.join(', ')}` },
        { status: 400 }
      )
    }

    // checks caller's manageStaffing, target is in the workspace, then upserts
    const member = await addProjectMember({
      requestingUserId: session.user.id,
      targetUserId: userId,
      projectId,
      role,
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const { id: projectId } = await params

    // 404 outsider, 403 unassigned member, else we get their role
    const { role } = await requireProjectMembership(session.user.id, projectId)

    // permission comes from the matrix, not a hardcoded role list
    if (!can(role, 'viewRoster')) {
      throw new ForbiddenError('You do not have permission to view the team on this project.')
    }

    // same matrix, second question: may this caller change the roster?
    // ProjectMembersPanel shows / hides Add and remove from this value.
    const canManage = can(role, 'manageStaffing')

    const members = await listProjectMembers(projectId)

    // emails are NOT hidden from non-managers here on purpose: any
    // workspace member can already read every member's email from
    // GET /api/workspace/members, so hiding it here would protect nothing.
    return NextResponse.json({
      members,
      currentUserId: session.user.id, // so the panel can mark "(you)"
      canManage,
    })
  } catch (error) {
    return handleApiError(error)
  }
}