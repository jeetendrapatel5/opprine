// app/portal/[token]/page.jsx

// Server component — fetches data before rendering
// No 'use client' needed here

import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import PortalHeader from '@/components/portal/PortalHeader'
import UpdateFeed from '@/components/portal/UpdateFeed'
import EmptyUpdates from '@/components/portal/EmptyUpdates'

export default async function PortalPage({ params }) {
  // params.token comes from the URL
  // If URL is /portal/abc123 then params.token = "abc123"
  const { token } = await params

  // Find the client with this magic token
  // Include their project and all updates
  const client = await prisma.client.findUnique({
    where: {
      magicToken: token
    },
    include: {
      project: {
        include: {
          // Get the freelancer name to show "Project by Jeetu"
          user: {
            select: {
              name: true  // only fetch name, not password etc
            }
          },
          // Get all updates, newest first
          updates: {
            orderBy: {
              createdAt: 'desc'
            }
          },
          files: {
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      }
    }
  })

  // If no client found with this token — show 404 page
  // notFound() is a Next.js function that renders the not-found page
  if (!client) {
    notFound()
  }

  const { project } = client

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm font-bold text-blue-600">ClientPortal</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Project header */}
        <PortalHeader
          project={project}
          clientName={client.name}
          freelancerName={project.user.name}
        />

        {/* Updates section */}
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

                  <a href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 font-medium"
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
}