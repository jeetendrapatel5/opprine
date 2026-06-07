import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"

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

    // 2. Security Check (BOLA Prevention): Ensure this user owns the project
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 403 });
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
        status: "PENDING" // Default status from your Prisma schema
      }
    });

    return NextResponse.json(milestone, { status: 201 });

  } catch (error) {
    console.error("Failed to create milestone:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}