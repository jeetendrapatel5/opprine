import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect, notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, Briefcase } from 'lucide-react'

import ProjectSidebar from '@/components/project/ProjectSidebar'
import ProjectTabs from '@/components/project/ProjectTabs'
import MilestoneManager from '@/components/dashboard/MilestoneManager'
import ClientReviewCard from '@/components/dashboard/ClientReviewCard'

export default async function ProjectPage({ params }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  
  if (!session) redirect('/signin')

  const project = await prisma.project.findFirst({
    where: {
      id: id,
      userId: session.user.id 
    },
    include: {
      client: true,
      updates: { orderBy: { createdAt: "desc" } },
      files: { orderBy: { createdAt: "desc" } },
      milestones: { orderBy: { order: "asc" } }
    }
  })

  if (!project) notFound()

  const portalLink = `${process.env.NEXTAUTH_URL}/portal/${project.client?.magicToken}`

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24">
      
      {/* TOP NAVIGATION BREADCRUMB */}
      <div className="border-b border-slate-200/60 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-2 text-sm font-medium text-slate-500">
          <Link href="/dashboard" className="flex items-center gap-1.5 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <div className="flex items-center gap-2 text-slate-900">
            <Briefcase className="w-4 h-4 text-slate-400" />
            {project.name}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-10">
        
        {/* PAGE TITLE */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            {project.name}
          </h1>
          {project.description && (
            <p className="mt-2 text-slate-500 max-w-2xl text-base">
              {project.description}
            </p>
          )}
        </div>

        {/* 2-COLUMN WORKSPACE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Main Interactive Workspace (Milestones & Tabs) */}
          <div className="lg:col-span-8 space-y-8">
            <MilestoneManager
              projectId={project.id}
              initialMilestones={project.milestones}
            />
            
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
              <ProjectTabs project={project} />
            </div>
          </div>

          {/* RIGHT COLUMN: Sidebar Metadata & Actions */}
          <div className="lg:col-span-4 space-y-6">
            {/* We extract the header info into a sleek sidebar widget */}
            <ProjectSidebar project={project} portalLink={portalLink} />
            
            <ClientReviewCard project={project} />
          </div>

        </div>
      </div>
    </div>
  )
}