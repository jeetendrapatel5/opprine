// Real path: app/api/tasks/route.js  (POST create, GET list)
//
// Mirrors the milestone route shape: collection-level create/list live
// at the top level, with the parent ID passed as a body field (POST)
// or query param (GET) rather than nested in the URL — same pattern as
// POST /api/milestones taking `projectId` in the body. Not something
// the handoff doc specified, just picked for consistency with the
// milestone routes you already have — flag it if you'd rather nest
// these under /api/milestones/[id]/tasks instead.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireProjectMembership } from "@/lib/project";
import { handleApiError } from "@/lib/http-errors";
import { ForbiddenError } from "@/lib/errors";

// Confirms `userId` can actually be assigned a task on `projectId` —
// i.e. they're staffed on it (or OWNER/ADMIN with implicit access).
// Not called out in the handoff doc, but assigning a task to someone
// with zero access to the project would be a dead end for them. Used
// by both POST (assigning at creation) and PATCH (reassigning) in the
// [id] route. Kept local to these two files for now — worth promoting
// into lib/project.js if a third caller ever needs it.
async function assertAssignable(userId, projectId) {
  try {
    await requireProjectMembership(userId, projectId);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      throw new ForbiddenError("assignedToId must be a member of this project.");
    }
    throw error;
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { milestoneId, title, description, dueDate, assignedToId } = body;

    if (!milestoneId || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Resolve milestone -> project, then check access. Tasks are open
    // to any staffed project member — no requireProjectRole call here,
    // on purpose. That's the confirmed decision: task creation/edits
    // stay open, unlike milestones which require PROJECT_MANAGER.
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      select: { projectId: true },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    await requireProjectMembership(session.user.id, milestone.projectId);

    if (assignedToId) {
      await assertAssignable(assignedToId, milestone.projectId);
    }

    // Same "next order" pattern as milestone creation.
    const lastTask = await prisma.task.findFirst({
      where: { milestoneId },
      orderBy: { order: 'desc' },
    });
    const nextOrder = lastTask ? lastTask.order + 1 : 0;

    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        milestoneId,
        assignedToId: assignedToId || null,
        createdByUserId: session.user.id,
        order: nextOrder,
      },
    });

    return NextResponse.json(task, { status: 201 });

  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const milestoneId = searchParams.get("milestoneId");

    if (!milestoneId) {
      return NextResponse.json({ error: "milestoneId is required" }, { status: 400 });
    }

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      select: { projectId: true },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    await requireProjectMembership(session.user.id, milestone.projectId);

    const tasks = await prisma.task.findMany({
      where: { milestoneId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(tasks);

  } catch (error) {
    return handleApiError(error);
  }
}