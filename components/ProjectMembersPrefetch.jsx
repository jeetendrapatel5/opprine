// components/ProjectMembersPrefetch.jsx
//
// Renders nothing. Put it once on the project page; it warms the cache for
// THIS project only. Works whether page.jsx is a server or a client component.
//
// Usage: <ProjectMembersPrefetch projectId={project.id} />

'use client'

import { usePrefetchProjectMembers } from '@/hooks/useProjectMembers'

export default function ProjectMembersPrefetch({ projectId }) {
  usePrefetchProjectMembers(projectId)
  return null
}