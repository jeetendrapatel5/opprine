// app/api/milestones/route.js  (POST)

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"
import { requireProjectMembership } from "@/lib/project";
import { can } from "@/lib/project-permissions";
import { ForbiddenError } from "@/lib/errors";
import { handleApiError } from "@/lib/http-errors";

export async function POST(request) {
  try {
    // 1. Authenticate the user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, title } = body;

    if (!projectId || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 2. Project-scoped authorization. requireProjectMembership does
    // the BOLA-prevention work: throws NotFoundError if projectId
    // doesn't exist, ForbiddenError if this user has no ProjectMember
    // row on it AND isn't OWNER/ADMIN of its workspace.
    //
    // CHANGED: was requireProjectRole(membership.role, ['PROJECT_MANAGER']).
    // Milestones are gated to whoever can 'manageMilestones' in the
    // matrix — Owner/Admin and PM, not Contributor. A raw
    // 'PROJECT_MANAGER' string check would now WRONGLY block an
    // Owner/Admin using implicit access, since requireProjectMembership
    // returns their real role ('OWNER'/'ADMIN') instead of the old
    // hardcoded 'PROJECT_MANAGER' — see the comment in lib/project.js.
    const membership = await requireProjectMembership(session.user.id, projectId);
    if (!can(membership.role, 'manageMilestones')) {
      throw new ForbiddenError('You do not have permission to create milestones on this project.');
    }

    // 3. Auto-calculate the next order number
    const existingMilestones = await prisma.milestone.findMany({
      where: { projectId },
      orderBy: { order: 'desc' },
      take: 1
    });

    const nextOrder = existingMilestones.length > 0 ? existingMilestones[0].order + 1 : 1;

    // 4. Create the milestone
    const milestone = await prisma.milestone.create({
      data: {
        title,
        order: nextOrder,
        projectId,
        status: "PENDING",
        createdByUserId: session.user.id,
      }
    });

    return NextResponse.json(milestone, { status: 201 });

  } catch (error) {
    return handleApiError(error);
  }
}