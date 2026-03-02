import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import NewProjectModal from '@/components/NewProjectModal'
import StatsCard from '@/components/StatsCard'
import ProjectCard from '@/components/ProjectCard'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/signin')

  const projects = await prisma.project.findMany({
    where: {
      userId: session.user.id 
    },
    include: {
      client: true,
      updates: {
        orderBy: { createdAt: 'desc' },
        take: 1      
      }
    },
    orderBy: {
      createdAt: 'desc' 
    }
  })

  const totalProjects = projects.length
  const activeProjects = projects.filter(p => p.status === 'ACTIVE').length
  const completedProjects = projects.filter(p => p.status === 'COMPLETED').length

  const firstName = session.user.name.split(' ')[0]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div>
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {firstName}.
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Here is an overview of your projects
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatsCard label="Total Projects" value={totalProjects} color="blue" />
        <StatsCard label="Active" value={activeProjects} color="green" />
        <StatsCard label="Completed" value={completedProjects} color="purple" />
      </div>

      {/* Projects Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          My Projects
        </h2>
        {/* NewProjectModal is a client component — handles the form */}
        <NewProjectModal userId={session.user.id} />
      </div>

      {/* Project List */}
      {projects.length === 0 ? (
        // Empty state — shown when user has no projects yet
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-400 text-sm">No projects yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Click "New Project" to create your first one
          </p>
        </div>
      ) : (
        // Project cards
        <div className="flex flex-col gap-3">
          {projects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

    </div>
  )
}