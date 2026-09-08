// app/api/milestones/[id]/route.js

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"
import { v2 as cloudinary } from "cloudinary";
import { sendEmail } from "@/lib/email";
import { milestoneReadyForReviewEmail } from "@/lib/emailTemplates";
import { requireProjectMembership } from "@/lib/project";
import { can } from "@/lib/project-permissions";
import { ForbiddenError } from "@/lib/errors";
import { handleApiError } from "@/lib/http-errors";

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const contentType = request.headers.get("content-type") ?? "";
    const isMultipart = contentType.includes("multipart/form-data");

    let updateData = {};

    if (isMultipart) {
      const formData = await request.formData();

      const deliveryHeadline = formData.get("deliveryHeadline");
      const deliverySummary  = formData.get("deliverySummary");
      const file             = formData.get("file");
      const checklistRaw     = formData.get("deliveryChecklist");

      if (deliveryHeadline !== null) updateData.deliveryHeadline = deliveryHeadline;
      if (deliverySummary  !== null) updateData.deliverySummary  = deliverySummary;
      if (checklistRaw)              updateData.deliveryChecklist = JSON.parse(checklistRaw);

      if (file && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer      = Buffer.from(arrayBuffer);

        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "freeport/deliveries", resource_type: "auto" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(buffer);
        });

        updateData.deliveryFileUrl  = uploadResult.secure_url;
        updateData.deliveryFileName = file.name;
        updateData.deliveryFileType = file.type;
      }

    } else {
      const body = await request.json();

      const {
        status,
        dueDate,
        deliveryHeadline,
        deliverySummary,
        deliveryFileUrl,
        deliveryFileName,
        deliveryFileType,
        deliveryChecklist,
        deliveryAnnotations,
      } = body;

      if (status !== undefined) {
        updateData.status = status;
        if (status === "COMPLETED") {
          updateData.completedAt = new Date();
        } else {
          updateData.completedAt = null;
        }
      }

      if (dueDate             !== undefined) updateData.dueDate             = dueDate ? new Date(dueDate) : null;
      if (deliveryHeadline    !== undefined) updateData.deliveryHeadline    = deliveryHeadline;
      if (deliverySummary     !== undefined) updateData.deliverySummary     = deliverySummary;
      if (deliveryFileUrl     !== undefined) updateData.deliveryFileUrl     = deliveryFileUrl;
      if (deliveryFileName    !== undefined) updateData.deliveryFileName    = deliveryFileName;
      if (deliveryFileType    !== undefined) updateData.deliveryFileType    = deliveryFileType;
      if (deliveryChecklist   !== undefined) updateData.deliveryChecklist   = deliveryChecklist;

      if (deliveryAnnotations !== undefined) {
        updateData.deliveryAnnotations = deliveryAnnotations;
      }
    }

    // Fetch first, authorize second — a milestone-scoped role check
    // needs the milestone's projectId before it can run.
    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            client: {
              select: {
                name:       true,
                email:      true,
                magicToken: true,
              },
            },
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // CHANGED: was requireProjectRole(membership.role, ['PROJECT_MANAGER']).
    // Same 'manageMilestones' check as the create route — see the
    // comment there for why a raw 'PROJECT_MANAGER' string compare is
    // now wrong for implicit Owner/Admin access.
    //
    // Note: `milestone.project.client` (with the client's name/email/
    // magicToken) is fetched here only to build the review email
    // below — it is NEVER put into the JSON response. `updated`
    // (returned at the bottom) comes from a separate, narrower
    // prisma.milestone.update() call. If you ever change this route
    // to return `milestone` directly instead of `updated`, that
    // client data would leak straight into a Contributor's response —
    // worth a comment at the return site so nobody "simplifies" this
    // later without noticing.
    const membership = await requireProjectMembership(session.user.id, milestone.projectId);
    if (!can(membership.role, 'manageMilestones')) {
      throw new ForbiddenError('You do not have permission to update this milestone.');
    }

    const updated = await prisma.milestone.update({
      where: { id },
      data:  updateData,
    });

    if (updateData.status === "IN_REVIEW") {
      const { project } = milestone;
      const client = project?.client;

      if (client?.email) {
        const portalUrl = `${process.env.NEXTAUTH_URL}/portal/${client.magicToken}`;

        const { subject, html } = milestoneReadyForReviewEmail({
          clientName:       client.name,
          freelancerName:   project.user.name,
          projectName:      project.name,
          milestoneTitle:   milestone.title,
          deliveryHeadline: updated.deliveryHeadline,
          deliverySummary:  updated.deliverySummary,
          portalUrl,
        });

        sendEmail({ to: client.email, subject, html }).catch((err) => {
          console.error("[PATCH milestone] Failed to send review email:", err);
        });
      }
    }

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

    const milestone = await prisma.milestone.findUnique({
      where: { id },
      select: { projectId: true },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // CHANGED — same reason as PATCH above.
    const membership = await requireProjectMembership(session.user.id, milestone.projectId);
    if (!can(membership.role, 'manageMilestones')) {
      throw new ForbiddenError('You do not have permission to delete this milestone.');
    }

    await prisma.milestone.delete({ where: { id } });

    return NextResponse.json({ success: true });

  } catch (error) {
    return handleApiError(error);
  }
}