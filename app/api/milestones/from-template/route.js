// app/api/milestones/from-template/route.js
//
// POST — create a batch of milestones on a project from a hardcoded
// template (lib/milestoneTemplates.js), instead of creating each one
// by hand via POST /api/milestones. Same gate as manual milestone
// creation — anyone who can 'manageMilestones' (Owner/Admin, PM; not
// Contributor), since this is still "creating milestones," just N of
// them in one call instead of one.
//
// Route shape matches POST /api/milestones: projectId lives in the
// body, not the URL — same flat-collection convention as the rest of
// the milestone routes (milestones/route.js, milestones/reorder/route.js).

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireProjectMembership } from "@/lib/project";
import { can } from "@/lib/project-permissions";
import { ForbiddenError } from "@/lib/errors";
import { getMilestoneTemplate } from "@/lib/milestoneTemplates";
import { handleApiError } from "@/lib/http-errors";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, templateKey } = body;

    if (!projectId || !templateKey) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // CHANGED: was requireProjectRole(membership.role, ['PROJECT_MANAGER']).
    // Same reason as every other milestone route in this session —
    // applying a template is still 'manageMilestones', and the raw
    // 'PROJECT_MANAGER' string check silently breaks implicit
    // Owner/Admin access now that requireProjectMembership returns
    // their real role instead of a hardcoded stand-in.
    const membership = await requireProjectMembership(session.user.id, projectId);
    if (!can(membership.role, 'manageMilestones')) {
      throw new ForbiddenError('You do not have permission to create milestones on this project.');
    }

    const template = getMilestoneTemplate(templateKey);
    if (!template) {
      return NextResponse.json({ error: `Unknown template key: ${templateKey}` }, { status: 400 });
    }

    // Same "next order" pattern as POST /api/milestones — pick up
    // after whatever's already on the project rather than assuming
    // it's empty. A project that already has milestones and applies a
    // template just gets the template's milestones appended after them.
    const existingMilestones = await prisma.milestone.findMany({
      where: { projectId },
      orderBy: { order: 'desc' },
      take: 1,
    });
    const startingOrder = existingMilestones.length > 0 ? existingMilestones[0].order + 1 : 1;

    // One transaction — either all of the template's milestones land,
    // or none do. Same reasoning as the reorder route's batch update:
    // a half-applied template (3 of 6 created, then a failure) would
    // be a confusing state to leave a project in.
    const created = await prisma.$transaction(
      template.milestones.map((m, index) =>
        prisma.milestone.create({
          data: {
            title: m.title,
            order: startingOrder + index,
            projectId,
            status: "PENDING",
            createdByUserId: session.user.id,
          },
        })
      )
    );

    return NextResponse.json(created, { status: 201 });

  } catch (error) {
    return handleApiError(error);
  }
}