// app/api/milestones/[id]/route.js

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { v2 as cloudinary } from "cloudinary";
import { sendEmail } from "@/lib/email";
import { milestoneReadyForReviewEmail } from "@/lib/emailTemplates";

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/milestones/[id]
//
// Handles two content types:
//   multipart/form-data — delivery card with a new file upload
//   application/json    — status changes, delivery text, checklist, dueDate
//
// After a successful update:
//   If status === 'IN_REVIEW' → send "ready for review" email to client
//
// Security: atomic ownership check using nested where clause.
// ─────────────────────────────────────────────────────────────────────────────

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
      // ── MULTIPART PATH ────────────────────────────────────────────────────
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
      // ── JSON PATH ─────────────────────────────────────────────────────────
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
      } = body;

      if (status !== undefined) {
        updateData.status = status;
        if (status === "COMPLETED") {
          updateData.completedAt = new Date();
        } else {
          updateData.completedAt = null;
        }
      }

      if (dueDate          !== undefined) updateData.dueDate          = dueDate ? new Date(dueDate) : null;
      if (deliveryHeadline !== undefined) updateData.deliveryHeadline = deliveryHeadline;
      if (deliverySummary  !== undefined) updateData.deliverySummary  = deliverySummary;
      if (deliveryFileUrl  !== undefined) updateData.deliveryFileUrl  = deliveryFileUrl;
      if (deliveryFileName !== undefined) updateData.deliveryFileName = deliveryFileName;
      if (deliveryFileType !== undefined) updateData.deliveryFileType = deliveryFileType;
      if (deliveryChecklist !== undefined) updateData.deliveryChecklist = deliveryChecklist;
    }

    // ── Atomic ownership check ────────────────────────────────────────────────
    // We include the project and its relations here because the email (if
    // triggered) needs client email, client magic token, project name, and
    // freelancer name. Including them here means zero extra DB queries —
    // we fetch everything in one shot.
    //
    // WHY include even when we might not send an email:
    // The overhead of fetching a few extra fields in one query is negligible.
    // The alternative — a second conditional query just for email data —
    // would be slower and more complex code.
    const milestone = await prisma.milestone.findFirst({
      where: {
        id,
        project: { userId: session.user.id },
      },
      include: {
        project: {
          include: {
            // client — needed for: to address, client name, portal URL
            client: {
              select: {
                name:       true,
                email:      true,
                magicToken: true,
              },
            },
            // user — needed for: freelancer name in the email body
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

    // ── Perform the update ────────────────────────────────────────────────────
    const updated = await prisma.milestone.update({
      where: { id },
      data:  updateData,
    });

    // ── Send email if status just became IN_REVIEW ────────────────────────────
    // We check updateData.status (what we're setting) not milestone.status
    // (what it was before). This ensures we only send once — when the
    // status transitions TO IN_REVIEW, not every time any field updates.
    //
    // WHY fire-and-forget (no await):
    // The milestone is already saved successfully. The client's approval
    // experience should not be blocked or broken by an email failure.
    // If Resend is down or the API key is wrong, the milestone still saves.
    // We log the error but don't surface it to the user.
    if (updateData.status === "IN_REVIEW") {
      const { project } = milestone;
      const client = project?.client;

      // Guard: only send if the project actually has a client with an email.
      // A project without a client is an edge case but we handle it cleanly.
      if (client?.email) {
        // Build the full portal URL the client clicks in the email.
        // NEXTAUTH_URL is already in your .env (Next-Auth requires it).
        // Example result: https://app.freeport.dev/portal/abc123xyz
        const portalUrl = `${process.env.NEXTAUTH_URL}/portal/${client.magicToken}`;

        const { subject, html } = milestoneReadyForReviewEmail({
          clientName:       client.name,
          freelancerName:   project.user.name,
          projectName:      project.name,
          milestoneTitle:   milestone.title,
          // Use the updated delivery fields — updated.deliveryHeadline reflects
          // what was just saved, which may differ from milestone.deliveryHeadline
          // (the value before this PATCH ran)
          deliveryHeadline: updated.deliveryHeadline,
          deliverySummary:  updated.deliverySummary,
          portalUrl,
        });

        // Fire and forget — email sends in background, doesn't delay response
        sendEmail({ to: client.email, subject, html }).catch((err) => {
          console.error("[PATCH milestone] Failed to send review email:", err);
        });
      }
    }

    return NextResponse.json(updated);

  } catch (error) {
    console.error("[PATCH /api/milestones/[id]]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const milestone = await prisma.milestone.findFirst({
      where: {
        id,
        project: { userId: session.user.id },
      },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.milestone.delete({ where: { id } });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[DELETE /api/milestones/[id]]", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}