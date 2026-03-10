import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(request, { params }) {
  try {
    const { token } = await params;
    const { itemId, type } = await request.json(); // type: 'update' or 'milestone'

    // 1. Security: Validate magicToken exists and belongs to a project
    const client = await prisma.client.findUnique({
      where: { magicToken: token },
      include: { project: true }
    });

    if (!client) {
      return NextResponse.json({ error: "Invalid access token" }, { status: 401 });
    }

    // 2. Atomic Update: Ensure the item belongs to the client's project
    if (type === 'milestone') {
      const updated = await prisma.milestone.update({
        where: { id: itemId, projectId: client.projectId },
        data: { 
          status: 'COMPLETED', 
          approvedAt: new Date() 
        }
      });
      return NextResponse.json(updated);
    } 
    
    if (type === 'update') {
      const updated = await prisma.update.update({
        where: { id: itemId, projectId: client.projectId },
        data: { 
          status: 'DONE', 
          approvedAt: new Date() 
        }
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid item type" }, { status: 400 });

  } catch (error) {
    console.error("Approval Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}