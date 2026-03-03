// app/portal/[token]/page.jsx
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import PortalHeader from '@/components/portal/PortalHeader'
import UpdateFeed from '@/components/portal/UpdateFeed'
import EmptyUpdates from '@/components/portal/EmptyUpdates'
import ProjectMilestones from '@/components/portal/ProjectMilestones'

// 1. Dynamic Metadata for a premium feel
export async function generateMetadata({ params }) {
  const { token } = await params

  const client = await prisma.client.findUnique({
    where: { magicToken: token },
    include: { project: true }
  })

  if (!client) return { title: 'Portal Not Found' }

  return {
    title: `${client.project.name} | Client Portal`,
    description: `Project updates and files for ${client.name}`,
  }
}

export default async function PortalPage({ params }) {
  const { token } = await params

  try {
    // 2. Bounded Query for Scalability
    const client = await prisma.client.findUnique({
      where: {
        magicToken: token
      },
      include: {
        project: {
          include: {
            user: {
              select: { name: true }
            },
            updates: {
              orderBy: { createdAt: 'desc' },
              take: 20 // LIMIT added: Protects DB performance
            },
            files: {
              orderBy: { createdAt: 'desc' },
              take: 50 // LIMIT added
            },
            milestones: {
              orderBy: { createdAt: 'asc' }
            }
          }
        }
      }
    })

    if (!client) {
      notFound()
    }

    const { project } = client

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-2xl mx-auto">
            <p className="text-sm font-bold text-blue-600">ClientPortal</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8">
          <PortalHeader
            project={project}
            clientName={client.name}
            freelancerName={project.user.name}
          />

          <div className="mt-8">
            <ProjectMilestones milestones={project.milestones} />
          </div>

          {/* Placeholder for future Milestone component */}
          {/* <ProjectMilestones projectId={project.id} /> */}

          <div className="mt-8">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              📋 Project Updates
            </h2>
            {project.updates.length === 0 ? (
              <EmptyUpdates />
            ) : (
              <UpdateFeed updates={project.updates} />
            )}
          </div>

          {project.files.length > 0 && (
            <div className="mt-8">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                📎 Project Files
              </h2>
              <div className="flex flex-col gap-2">
                {project.files.map((file) => (
                  <div
                    key={file.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{file.name}</p>
                      <p className="text-xs text-gray-400">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>

                    {/* 3. Security: Route through an API endpoint, DO NOT expose raw storage URLs */}
                    <a
                      href={`/api/files/download?fileId=${file.id}&token=${token}`}
                      className="text-sm text-blue-600 font-medium hover:underline"
                    >
                      Download ↗
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  } catch (error) {
    // 4. Graceful Error Handling
    console.error("Failed to load portal:", error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-800">
        <p>Something went wrong loading this portal. Please try again later.</p>
      </div>
    )
  }
}