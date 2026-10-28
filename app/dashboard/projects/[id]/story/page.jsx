// app/dashboard/projects/[id]/story/page.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Server Component. Auth-gated. Fetches the project and passes it to
// the StoryEditor client component.
//
// What this file does, in order:
//   1. Reads the project id from the URL.
//   2. Checks the visitor is signed in (otherwise → /signin).
//   3. Loads the project, but ONLY if it belongs to this user. The `userId`
//      inside `where` is the ownership check: someone else's project returns
//      null here, and we answer with a 404.
//   4. Renders the breadcrumb, the page header and the editor.
//
// Why completed milestones and files are loaded here:
//   The editor's preview shows the milestone list and falls back to a
//   milestone/file image when no cover is uploaded. Loading them on the server
//   means the editor has everything on first paint — no loading states.
// ─────────────────────────────────────────────────────────────────────────────

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import StoryEditor from '@/components/dashboard/story/StoryEditor'

export default async function ProjectStoryPage({ params }) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  if (!session) redirect('/signin')

  const project = await prisma.project.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    include: {
      // user — the preview shows "By {name}"
      user: {
        select: { name: true },
      },
      // client — needed for the "hide client name" preview
      client: {
        select: { name: true },
      },
      // Only completed milestones — these are the deliverables shown in the story
      milestones: {
        where:   { status: 'COMPLETED' },
        orderBy: { completedAt: 'asc' },
      },
      // Files — only used to pick a fallback hero image
      files: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!project) notFound()

  return (
    <div className="mx-auto max-w-7xl pb-24">

      {/* ── Breadcrumb ── */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-1.5 text-xs font-medium">
          <li className="flex items-center gap-1.5">
            <Link
              href="/dashboard"
              className="text-fp-text-secondary transition-colors duration-150 hover:text-fp-text-primary"
            >
              Dashboard
            </Link>
            <ChevronRight className="size-3.5 shrink-0 text-fp-text-tertiary" aria-hidden="true" />
          </li>
          <li className="flex min-w-0 items-center gap-1.5">
            <Link
              href={`/dashboard/projects/${id}`}
              className="block max-w-40 truncate text-fp-text-secondary transition-colors duration-150 hover:text-fp-text-primary sm:max-w-64"
            >
              {project.name}
            </Link>
            <ChevronRight className="size-3.5 shrink-0 text-fp-text-tertiary" aria-hidden="true" />
          </li>
          <li aria-current="page" className="text-fp-text-primary">
            Project Story
          </li>
        </ol>
      </nav>

      {/* ── Page header ── */}
      <header className="mb-8">
        <h1 className="font-display text-2xl font-medium tracking-tight text-fp-text-primary sm:text-3xl">
          Project Story
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-fp-text-secondary">
          Turn this project into a public case study that wins you the next client.
        </p>
      </header>

      {/* ── Editor ── */}
      <StoryEditor project={project} />
    </div>
  )
}