// app/api/milestones/[id]/route.js

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { v2 as cloudinary } from "cloudinary";

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/milestones/[id]
//
// Handles two content types in one route:
//
//   multipart/form-data — used when a NEW file is being uploaded with the
//                         delivery card (future use, or if you add direct
//                         file upload to the modal later)
//
//   application/json    — used for everything else:
//                         · status changes (PENDING → IN_PROGRESS, etc.)
//                         · delivery card text fields (headline, summary)
//                         · delivery file reference (URL from existing upload)
//                         · checklist array
//                         · dueDate
//
// Security: atomic ownership check — one Prisma query checks both the
// milestone ID and that its parent project belongs to the session user.
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
      // ── MULTIPART PATH — new file uploaded directly ───────────────────────
      // This path is used if the freelancer uploads a brand new file
      // directly from the delivery modal (not picking from existing updates).
      const formData = await request.formData();

      const deliveryHeadline = formData.get("deliveryHeadline");
      const deliverySummary  = formData.get("deliverySummary");
      const file             = formData.get("file");
      const checklistRaw     = formData.get("deliveryChecklist");

      if (deliveryHeadline !== null) updateData.deliveryHeadline = deliveryHeadline;
      if (deliverySummary  !== null) updateData.deliverySummary  = deliverySummary;

      if (checklistRaw) {
        updateData.deliveryChecklist = JSON.parse(checklistRaw);
      }

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
      // ── JSON PATH — status changes, delivery card text, checklist ─────────
      // THIS IS THE PATH DeliveryModal USES.
      // We must handle all delivery fields here, not just status and dueDate.
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

      // Only add a field to updateData if it was actually included in the request.
      // "undefined" means the key wasn't sent at all — we skip it.
      // "null" means the caller wants to clear the field — we include it.
      // This pattern lets partial updates work correctly.

      if (status !== undefined) {
        updateData.status = status;
        // Auto-manage completedAt whenever status changes
        if (status === "COMPLETED") {
          updateData.completedAt = new Date();
        } else {
          updateData.completedAt = null;
        }
      }

      if (dueDate !== undefined) {
        updateData.dueDate = dueDate ? new Date(dueDate) : null;
      }

      if (deliveryHeadline !== undefined) updateData.deliveryHeadline = deliveryHeadline;
      if (deliverySummary  !== undefined) updateData.deliverySummary  = deliverySummary;
      if (deliveryFileUrl  !== undefined) updateData.deliveryFileUrl  = deliveryFileUrl;
      if (deliveryFileName !== undefined) updateData.deliveryFileName = deliveryFileName;
      if (deliveryFileType !== undefined) updateData.deliveryFileType = deliveryFileType;

      // deliveryChecklist is a String[] — we accept it as an array directly
      if (deliveryChecklist !== undefined) {
        updateData.deliveryChecklist = deliveryChecklist;
      }
    }

    // ── Atomic ownership check ────────────────────────────────────────────────
    // One query. Confirms milestone exists AND belongs to this user's project.
    const milestone = await prisma.milestone.findFirst({
      where: {
        id,
        project: { userId: session.user.id },
      },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.milestone.update({
      where: { id },
      data:  updateData,
    });

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