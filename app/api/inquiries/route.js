import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { projectId, name, email, message } = await request.json();

    if (!projectId || !name || !email || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch the project to get the freelancer's email
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { user: true }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 2. Save the Lead to the Database
    const inquiry = await prisma.inquiry.create({
      data: { projectId, name, email, message }
    });

    // 3. Email the Freelancer instantly (Using your existing Resend setup)
    await resend.emails.send({
      from: 'ClientPortal Leads <onboarding@resend.dev>', // Update to your domain later
      to: project.user.email,
      subject: `🎉 New Lead: ${name} wants to work with you!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <h2>You have a new project inquiry!</h2>
          <p>Someone saw your <strong>${project.name}</strong> showcase and wants to hire you.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p><strong>Message:</strong><br/>${message}</p>
          </div>
          <p>Reply directly to their email to close the deal!</p>
        </div>
      `
    });

    return NextResponse.json({ success: true, inquiry });
  } catch (error) {
    console.error("Inquiry Error:", error);
    return NextResponse.json({ error: "Failed to send inquiry" }, { status: 500 });
  }
}