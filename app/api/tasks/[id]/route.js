// Real path: app/api/tasks/[id]/route.js  (PATCH update, DELETE)

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireProjectMembership } from "@/lib/project";
import { handleApiError } from "@/lib/http-errors";
import { ForbiddenError } from "@/lib/errors";

// Same assignability check as in app/api/tasks/route.js — duplicated
// rather than imported since these are two separate route files with
// no shared module between them yet. Worth extracting into
// lib/project.js if this grows a third use.
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

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: { milestone: { select: { projectId: true } } },
    });

    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const projectId = task.milestone.projectId;

    // Open to any staffed project member — no requireProjectRole call.
    // If you'd rather restrict edits to just the assignee/creator, this
    // is the line to change — that was the open question you left as
    // "keep open" for now.
    await requireProjectMembership(session.user.id, projectId);

    const body = await request.json();
    const { title, description, status, dueDate, assignedToId, order } = body;

    const updateData = {};
    if (title !== undefined)       updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined)      updateData.status = status;
    if (dueDate !== undefined)     updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (order !== undefined)       updateData.order = order; // ad hoc single-task reorder;
                                                               // no batch drag-reorder route yet,
                                                               // unlike milestones/reorder

    if (assignedToId !== undefined) {
      if (assignedToId) {
        await assertAssignable(assignedToId, projectId);
      }
      updateData.assignedToId = assignedToId || null;
    }

    const updated = await prisma.task.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);

  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const task = await prisma.task.findUnique({
      where: { id },
      select: { milestone: { select: { projectId: true } } },
    });

    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await requireProjectMembership(session.user.id, task.milestone.projectId);

    await prisma.task.delete({ where: { id } });

    return NextResponse.json({ success: true });

  } catch (error) {
    return handleApiError(error);
  }
}