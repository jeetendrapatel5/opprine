// app/api/portal/[token]/approve/route.js

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(request, { params }) {
  try {
    const { token } = await params;

    // Added 'action' and 'reason' to the destructure.
    // action = 'approve' or 'reject'
    // reason = optional string, only sent when action is 'reject'
    const { itemId, type, action = 'approve', reason } = await request.json();

    // Your existing security check — unchanged, it's correct
    const client = await prisma.client.findUnique({
      where: { magicToken: token },
      include: { project: true }
    });

    if (!client) {
      return NextResponse.json({ error: "Invalid access token" }, { status: 401 });
    }

    // Decide what data to write based on the action
    // approve → moves forward (COMPLETED / DONE)
    // reject  → moves backward (IN_PROGRESS) so freelancer can fix it
    if (type === 'milestone') {

      const milestoneData = action === 'approve'
        ? { status: 'COMPLETED', approvedAt: new Date(), rejectionNote: null }
        : { status: 'IN_PROGRESS', approvedAt: null, rejectionNote: reason ?? null }

      const updated = await prisma.milestone.update({
        where: { id: itemId, projectId: client.projectId },
        data: milestoneData
      });

      return NextResponse.json(updated);
    };

    if (type === 'update') {

      const updateData = action === 'approve'
        ? { status: 'DONE', approvedAt: new Date() }
        : { status: 'IN_PROGRESS', approvedAt: null }

      const updated = await prisma.update.update({
        where: { id: itemId, projectId: client.projectId },
        data: updateData
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid item type" }, { status: 400 });

  } catch (error) {
    console.error("Approval Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}