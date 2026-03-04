import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await request.json();

    // 1. Fetch milestone AND include the project to check ownership
    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: { project: true }
    });

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    // 2. Security Check: Does the logged-in user own the project this milestone belongs to?
    if (milestone.project.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    // 3. Update the status
    const updatedMilestone = await prisma.milestone.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json(updatedMilestone);
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Security check: Find milestone and ensure user owns the parent project
    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: { project: true }
    });

    if (!milestone || milestone.project.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.milestone.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}