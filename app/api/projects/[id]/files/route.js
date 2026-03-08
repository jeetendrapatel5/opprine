import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import cloudinary from '@/lib/cloudinary'
import prisma from '@/lib/prisma'

export async function POST(request, { params }) {
  try {
    // 1. Auth check
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Access the projectId from the URL params (Next.js 15 requires awaiting params)
    const { id: projectId } = await params;

    // 3. Read the form data for the file
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // 4. Verify project ownership (Security: BOLA check)
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        userId: session.user.id // Ensures user can only upload to THEIR project
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // 5. Convert file to base64 for Cloudinary
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const dataUri = `data:${file.type};base64,${base64}`

    // 6. Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: `client-portal/${projectId}`,
      resource_type: 'auto',
      public_id: `${Date.now()}-${file.name.replace(/\s+/g, '-')}`,
    })

    // 7. Save to Database
    const fileRecord = await prisma.file.create({
      data: {
        name: file.name,
        url: uploadResult.secure_url,
        fileType: file.type,
        size: uploadResult.bytes,
        projectId: projectId,
      }
    })

    return NextResponse.json(fileRecord, { status: 201 })

  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 }
    )
  }
}