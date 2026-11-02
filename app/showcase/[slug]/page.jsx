// app/showcase/[slug]/page.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Public case study page. No auth.
//
// The route stays at /showcase/[slug] — do not change it.
// ClientReviewCard already links here. ProjectSignOff already links here.
//
// Two layouts, chosen by project.caseStudyEnabled:
//   false → simple layout: testimonial + image gallery + contact form
//   true  → full story: cover, facts, challenge/outcome, gallery, testimonial,
//           milestone process, builder, contact form
//
// Both are built from the same small sections in components/showcase/.
//
// ── Why a new story used to show "404 Not Found" ─────────────────────────────
// 1. The page only loaded projects with `isPublic: true`.
// 2. The Story editor turns a story on by saving `caseStudyEnabled` and
//    `publicSlug`. It never sets `isPublic`.
// 3. So a freshly published story had a slug and was enabled, but the lookup
//    skipped it, `getProject` returned null, and the page answered notFound().
// The fix is on the read side, in one place (PUBLISHED below): a project is
// viewable when its owner has published it EITHER way. Fixing only the save
// side would leave every story that is already saved still broken.
//
// Two related problems fixed in the same place:
//   • generateMetadata did not check isPublic at all, so a private project's
//     title and outcome text could leak into search/share previews. It now
//     uses the same lookup as the page.
//   • Without `dynamic = 'force-dynamic'` Next.js can cache this page after the
//     first visit (Prisma queries are not tracked like fetch calls). That can
//     freeze a 404 or hide later edits. This page must always be fresh.
// ─────────────────────────────────────────────────────────────────────────────

import { cache } from 'react'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getAutoHeroImage } from '@/components/dashboard/story/story-config'
import ShowcaseShell from '@/components/showcase/ShowcaseChrome'
import ShowcaseGallery from '@/components/showcase/ShowcaseGallery'
import {
  Hero, ProjectFacts, Narrative, Testimonial, Process, Builder,
} from '@/components/showcase/ShowcaseStory'
import { formatDate, getImageFiles } from '@/components/showcase/showcase-utils'

export const dynamic = 'force-dynamic'

// "Published" = the owner turned the story on, or the project was already
// marked public (set by the original review / sign-off flow).
const PUBLISHED = {
  OR: [{ isPublic: true }, { caseStudyEnabled: true }],
}

// ── Data fetch ────────────────────────────────────────────────────────────────
// Wrapped in cache() so generateMetadata and the page share ONE database query
// per request instead of running it twice.
const getProject = cache(async (slug) =>
  prisma.project.findFirst({
    where: { publicSlug: slug, ...PUBLISHED },
    include: {
      user: {
        select: {
          name:         true,
          bio:          true,
          avatarUrl:    true,
          portfolioUrl: true,
          username:     true,
        },
      },
      client: {
        select: { name: true },
      },
      files: {
        select:  { id: true, name: true, url: true, fileType: true },
        orderBy: { createdAt: 'desc' },
      },
      // Only completed milestones — these form the "how we got there" list
      milestones: {
        where:   { status: 'COMPLETED' },
        orderBy: { completedAt: 'asc' },
        select: {
          id:               true,
          title:            true,
          completedAt:      true,
          deliveryHeadline: true,
          deliverySummary:  true,
          deliveryFileUrl:  true,
          deliveryFileType: true,
        },
      },
    },
  })
)

// ── SEO metadata ──────────────────────────────────────────────────────────────

export async function generateMetadata({ params }) {
  const { slug } = await params
  const project  = await getProject(slug)
  if (!project) return { title: 'Not Found' }

  const description = project.caseStudyOutcome?.substring(0, 160)
    || project.testimonial?.substring(0, 160)
    || `Verified project by ${project.user.name}.`

  const image = project.caseStudyCoverImage || getAutoHeroImage(project)

  return {
    title:       `${project.name} — Case Study by ${project.user.name}`,
    description,
    openGraph: {
      title:       `${project.name} — Case Study`,
      description,
      type:        'website',
      images:      image ? [image] : [],
    },
  }
}

// ── Layout: story off ─────────────────────────────────────────────────────────
// The original simple showcase. Same content as before, new presentation.

function SimpleLayout({ project }) {
  const clientLabel = project.client?.name || 'a private client'
  const images      = getImageFiles(project.files)

  return (
    <ShowcaseShell project={project}>
      <Hero project={project} clientLabel={clientLabel} hasWork={images.length > 0} />
      <Testimonial
        text={project.testimonial}
        rating={project.clientRating}
        clientLabel={clientLabel}
      />
      <ShowcaseGallery assets={images} />
    </ShowcaseShell>
  )
}

// ── Layout: story on ──────────────────────────────────────────────────────────

function StoryLayout({ project }) {
  const clientLabel = project.caseStudyHideClient
    ? 'A satisfied client'
    : (project.client?.name ?? 'A satisfied client')

  // Same rule the editor preview uses: uploaded cover, else a milestone image,
  // else a project image (see getAutoHeroImage).
  const heroImage = project.caseStudyCoverImage || getAutoHeroImage(project)
  const images    = getImageFiles(project.files)

  const lastCompleted = project.milestones.at(-1)?.completedAt
  const facts = [
    { label: 'Client',     value: clientLabel },
    { label: 'Industry',   value: project.caseStudyIndustry },
    { label: 'Delivered',  value: formatDate(lastCompleted) },
    { label: 'Milestones', value: project.milestones.length > 0 ? String(project.milestones.length) : null },
  ]

  return (
    <ShowcaseShell project={project}>
      <Hero
        project={project}
        clientLabel={clientLabel}
        industry={project.caseStudyIndustry}
        image={heroImage}
        hasWork={images.length > 0}
      />
      <ProjectFacts items={facts} techStack={project.caseStudyTechStack ?? []} />
      <Narrative challenge={project.caseStudyProblem} outcome={project.caseStudyOutcome} />
      <ShowcaseGallery assets={images} />
      <Testimonial
        text={project.testimonial}
        rating={project.clientRating}
        clientLabel={clientLabel}
      />
      <Process milestones={project.milestones} />
      <Builder user={project.user} />
    </ShowcaseShell>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ShowcasePage({ params }) {
  const { slug } = await params
  const project  = await getProject(slug)

  if (!project) notFound()

  // Route to the correct layout based on whether the story is enabled
  return project.caseStudyEnabled
    ? <StoryLayout project={project} />
    : <SimpleLayout project={project} />
}