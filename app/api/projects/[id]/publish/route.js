import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    const { clientRating, testimonial } = await request.json();

    // 1. Verify Ownership
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Generate SEO-friendly slug (e.g., "acme-website-8f3a2")
    const baseSlug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    const publicSlug = `${baseSlug}-${uniqueSuffix}`;

    // 3. Update Project to Public
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "COMPLETED",
        isPublic: true,
        publicSlug,
        clientRating: parseInt(clientRating) || 5,
        testimonial
      }
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Publish Error:", error);
    return NextResponse.json({ error: "Failed to publish project" }, { status: 500 });
  }
}