import { NextResponse } from "next/server"; // Fix: Capitalized 'N'
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        
        // 1. Basic Auth Check
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: projectId } = await params;
        const { name, url, size, fileType } = await request.json();

        // 2. SECURITY (BOLA Check): Ensure the user owns this project
        // Without this, a hacker could send a POST request to any project ID
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { userId: true }
        });

        if (!project || project.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden: You do not own this project" }, { status: 403 });
        }

        // 3. Database Write
        const newFile = await prisma.file.create({
            data: {
                name,
                url,
                size: parseInt(size) || 0, 
                fileType,
                projectId
            }
        });

        return NextResponse.json(newFile);
    } catch (error) {
        console.error("File Save Error:", error);
        return NextResponse.json({ error: "Failed to save file metadata" }, { status: 500 });
    }
}