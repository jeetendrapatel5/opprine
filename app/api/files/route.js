// app/api/files/route.js

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import cloudinary from '@/lib/cloudinary'
import prisma from '@/lib/prisma'

export async function POST(request) {
  try {
    // Step 1 — Auth check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Step 2 — Read the form data
    // Files are sent as FormData, not JSON
    // So we use request.formData() not request.json()
    const formData = await request.formData()
    const file      = formData.get('file')       // the actual file
    const projectId = formData.get('projectId')  // which project

    if (!file || !projectId) {
      return NextResponse.json(
        { error: 'File and projectId are required' },
        { status: 400 }
      )
    }

    // Step 3 — Verify project belongs to this user
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        userId: session.user.id
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Step 4 — Convert file to base64 string
    // Cloudinary SDK needs the file as a base64 data URI
    // File is a Web API Blob — we convert it to ArrayBuffer → Buffer → base64
    const arrayBuffer = await file.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)
    const base64      = buffer.toString('base64')
    const dataUri     = `data:${file.type};base64,${base64}`

    // Step 5 — Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder:         `client-portal/${projectId}`, // organise by project
      resource_type:  'auto',  // auto-detect: image, video, pdf etc
      public_id:      `${Date.now()}-${file.name.replace(/\s+/g, '-')}`,
    })

    // uploadResult.secure_url is the HTTPS URL of the uploaded file
    // uploadResult.bytes is the file size in bytes

    // Step 6 — Save file record to database
    const fileRecord = await prisma.file.create({
      data: {
        name:      file.name,
        url:       uploadResult.secure_url,
        fileType:  file.type,
        size:      uploadResult.bytes,
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