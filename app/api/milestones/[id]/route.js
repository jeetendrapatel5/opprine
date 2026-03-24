// app/api/milestones/[id]/route.js

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { v2 as cloudinary } from "cloudinary";

// -------------------------------------------------------------------
// What this file handles:
//   PATCH /api/milestones/[id]  — update status, delivery card fields, or dueDate
//   DELETE /api/milestones/[id] — delete a milestone
//
// Security pattern used (Architecture Rule #1 — ATOMIC OWNERSHIP CHECK):
//   We combine the milestone's id AND the session user's id in a SINGLE
//   Prisma query using a nested where clause. If either doesn't match,
//   Prisma returns null. We never fetch the data and check after.
// -------------------------------------------------------------------

export async function PATCH(request, { params }) {
  try {
    // Step 1 — Check the freelancer is logged in
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Step 2 — Detect whether this request is a file upload (multipart)
    // or a plain JSON update (status change, delivery text, due date, etc.)
    //
    // WHY: The delivery card allows the freelancer to optionally attach a file.
    // Files cannot be sent as JSON — they require multipart/form-data.
    // So this single route handles both cases.
    const contentType = request.headers.get("content-type") ?? "";
    const isMultipart = contentType.includes("multipart/form-data");

    let updateData = {};

    if (isMultipart) {
      // ── MULTIPART PATH — delivery card with an optional file ──────────────
      //
      // FormData contains text fields AND possibly a file.
      // We extract text fields manually from the FormData object.
      const formData = await request.formData();

      // Extract text fields — each one may or may not be present
      const deliveryHeadline = formData.get("deliveryHeadline");
      const deliverySummary  = formData.get("deliverySummary");
      const file             = formData.get("file"); // this is a File object, or null

      // deliveryChecklist comes as a JSON string (arrays can't be sent raw in FormData)
      const checklistRaw = formData.get("deliveryChecklist");
      const deliveryChecklist = checklistRaw ? JSON.parse(checklistRaw) : undefined;

      // Build the update object — only include fields that were actually sent
      if (deliveryHeadline !== null) updateData.deliveryHeadline = deliveryHeadline;
      if (deliverySummary  !== null) updateData.deliverySummary  = deliverySummary;
      if (deliveryChecklist !== undefined) updateData.deliveryChecklist = deliveryChecklist;

      // If a file was included, upload it to Cloudinary
      if (file && file.size > 0) {
        // Convert the File object to a Buffer so Cloudinary can accept it
        const arrayBuffer = await file.arrayBuffer();
        const buffer      = Buffer.from(arrayBuffer);

        // Upload to Cloudinary using the upload_stream API
        // We wrap it in a Promise because upload_stream uses callbacks, not async/await
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

        // Save all file metadata from Cloudinary's response
        updateData.deliveryFileUrl  = uploadResult.secure_url;
        updateData.deliveryFileName = file.name;
        updateData.deliveryFileType = file.type;
      }

    } else {
      // ── JSON PATH — status change, dueDate, or other simple fields ────────
      const body = await request.json();

      // Pull out only the fields we allow to be updated via JSON
      const { status, dueDate } = body;

      if (status !== undefined) {
        updateData.status = status;

        // Feature 1.2 — Auto-set completedAt
        //
        // RULE: When status becomes COMPLETED, record the exact timestamp.
        //       When status moves away from COMPLETED, clear that timestamp.
        //
        // WHY: This gives us an accurate "finished at" date for the timeline
        //      and for computing how long a milestone took.
        if (status === "COMPLETED") {
          updateData.completedAt = new Date();
        } else {
          updateData.completedAt = null;
        }
      }

      if (dueDate !== undefined) {
        // dueDate arrives as an ISO string from the client (e.g. "2025-09-01T00:00:00.000Z")
        // Prisma expects a JS Date object for DateTime fields
        updateData.dueDate = dueDate ? new Date(dueDate) : null;
      }
    }

    // Step 3 — ATOMIC OWNERSHIP CHECK + UPDATE in one query
    //
    // findFirst with nested where: { id, project: { userId } }
    // This single query confirms:
    //   (a) The milestone with this id exists
    //   (b) Its parent project belongs to the logged-in user
    // If either fails, Prisma returns null. We never see data that isn't ours.
    const milestone = await prisma.milestone.findFirst({
      where: {
        id,
        project: { userId: session.user.id },
      },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Step 4 — Perform the actual update
    const updated = await prisma.milestone.update({
      where: { id },
      data: updateData,
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

    // ATOMIC OWNERSHIP CHECK — same pattern as PATCH above
    // If the milestone doesn't exist OR doesn't belong to this user, returns null
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
