// app/dashboard/projects/[id]/page.jsx

import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect, notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import ProjectHeader from '@/components/project/ProjectHeader'
import ProjectTabs from '@/components/project/ProjectTabs'

export default async function ProjectPage({ params }) {
  // Always await params in Next.js 15+
  const { id } = await params

  const session = await getServerSession(authOptions)
  if (!session) redirect('/signin')

  // Fetch project — but ONLY if it belongs to this user
  // This is critical — without userId check, any logged-in
  // freelancer could view another freelancer's project just
  // by guessing the ID
  const project = await prisma.project.findUnique({
    where: {
      id: id,
      userId: session.user.id  // security check
    },
    include: {
      client: true,
      updates: {
        orderBy: { createdAt: 'desc' }  // newest first
      },
      files: {
        orderBy: { createdAt: 'desc' }  // newest first
      }
    }
  })

  // If project not found OR does not belong to this user → 404
  if (!project) {
    notFound()
  }

  // Build the portal link using the client's magic token
  // This is what the freelancer copies and sends to their client
  const portalLink = `${process.env.NEXTAUTH_URL}/portal/${project.client?.magicToken}`

  return (
    <div>
      {/* Back button */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        ← Back to Dashboard
      </Link>

      {/* Project header — name, status, client, portal link */}
      <ProjectHeader project={project} portalLink={portalLink} />

      {/* Tabs — Updates and Files */}
      <div className="mt-6">
        <ProjectTabs project={project} />
      </div>
    </div>
  )
}