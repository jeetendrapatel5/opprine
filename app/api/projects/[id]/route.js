import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    // Atomic ownership check — same pattern as the rest of the app
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    })

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // One line. PostgreSQL cascades everything.
    await prisma.project.delete({ where: { id } })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete project error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}