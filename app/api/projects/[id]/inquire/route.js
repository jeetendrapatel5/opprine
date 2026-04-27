// app/api/projects/[id]/inquire/route.js
//
// POST — public endpoint. Anyone can submit an inquiry about a project.
// No authentication required — this is called from the public showcase page.
//
// Security model:
//   - We verify the project exists AND isPublic: true before creating anything.
//     This prevents people from spamming inquiries on private projects by
//     guessing project IDs.
//   - The projectId comes from the URL — no body parameter needed.
//
// Accepts:
//   name        String — required
//   email       String — required
//   message     String — required
//   projectType String — optional ("New project", "Redesign", etc.)
//
// Returns: { success: true } on success
//
// TODO: add rate limiting here (e.g. upstash/ratelimit) before going to production.
//       Without it, this endpoint can be abused for spam. A simple IP-based
//       rate limit of 3 requests per hour per IP is sufficient.

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const body   = await request.json()

    const { name, email, message, projectType } = body

    // ── Input validation ──────────────────────────────────────────────────────
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }
    // Basic email format check — not exhaustive, just catches obvious mistakes
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
    }

    // ── Verify project is public ──────────────────────────────────────────────
    // We must check isPublic: true before creating the inquiry.
    // Without this check, anyone knowing a projectId could flood
    // a private project's inquiry list.
    const project = await prisma.project.findFirst({
      where: {
        id,
        isPublic: true,
      },
      select: { id: true },
    })

    if (!project) {
      // Return 404 rather than 403 — don't confirm the project exists
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
    }

    // ── Create the inquiry ────────────────────────────────────────────────────
    // projectType is optional — not a field in the current Inquiry model,
    // so we append it to the message if provided. This avoids a schema change
    // while still capturing the information.
    const fullMessage = projectType?.trim()
      ? `[${projectType.trim()}] ${message.trim()}`
      : message.trim()

    await prisma.inquiry.create({
      data: {
        name:      name.trim(),
        email:     email.trim(),
        message:   fullMessage,
        projectId: id,
      },
    })

    return NextResponse.json({ success: true }, { status: 201 })

  } catch (error) {
    console.error('[POST /api/projects/[id]/inquire]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}