// app/u/[username]/page.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Public freelancer portfolio page. No auth. No fp- tokens.
// Gated by: user.username exists AND user.profileEnabled is true.
// If either condition fails → notFound() (404, no information leak).
//
// Shows the freelancer's profile and a grid of their public case studies.
// ─────────────────────────────────────────────────────────────────────────────

import { notFound }  from 'next/navigation'
import prisma        from '@/lib/prisma'
import Link          from 'next/link'
import {
  ExternalLink, MapPin, Star, CheckCircle2, ArrowRight,
} from 'lucide-react'

// ── SEO metadata ──────────────────────────────────────────────────────────────

export async function generateMetadata({ params }) {
  const { username } = await params
  const user = await prisma.user.findFirst({
    where: { username, profileEnabled: true },
    select: { name: true, bio: true, profileTagline: true },
  })
  if (!user) return { title: 'Not Found' }

  return {
    title:       `${user.name} — Freelance Web Developer`,
    description: user.profileTagline ?? user.bio ?? `Portfolio of ${user.name}.`,
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function FreelancerProfilePage({ params }) {
  const { username } = await params

  // Fetch user. profileEnabled: true is the gate — false means 404.
  const user = await prisma.user.findFirst({
    where: {
      username,
      profileEnabled: true,
    },
    include: {
      projects: {
        where: {
          // Only show projects that are both public AND have story enabled.
          // isPublic alone isn't enough — the case study must be set up too.
          isPublic:           true,
          caseStudyEnabled:   true,
          publicSlug:         { not: null },
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          client: { select: { name: true } },
          // Take the first file as a thumbnail fallback
          files: {
            where:   { fileType: { startsWith: 'image/' } },
            take:    1,
            orderBy: { createdAt: 'desc' },
          },
          // Count completed milestones for the "X milestones" stat
          milestones: {
            where:  { status: 'COMPLETED' },
            select: { id: true },
          },
        },
      },
    },
  })

  if (!user) notFound()

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Profile header ─────────────────────────────────────────────────── */}
      {/* White card, centered, generous padding.                               */}
      {/* Psychology: a confident, clean header signals professionalism.        */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">

            {/* Avatar */}
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-24 h-24 md:w-28 md:h-28 rounded-2xl object-cover border-2 border-gray-100 shrink-0 shadow-sm"
              />
            ) : (
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center shrink-0 text-indigo-600 font-extrabold text-4xl">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Identity */}
            <div className="text-center md:text-left flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 text-xs font-bold uppercase tracking-widest rounded-full mb-3">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Available for projects
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                {user.name}
              </h1>

              {/* Tagline — the marketing pitch */}
              {user.profileTagline && (
                <p className="text-lg text-gray-600 mt-2 leading-relaxed max-w-xl">
                  {user.profileTagline}
                </p>
              )}

              {/* Bio — factual context */}
              {user.bio && !user.profileTagline && (
                <p className="text-base text-gray-500 mt-2 leading-relaxed max-w-xl">
                  {user.bio}
                </p>
              )}

              {/* Links row */}
              {user.portfolioUrl && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
                  
                  <Link href={user.portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {user.portfolioUrl.replace(/^https?:\/\//, '')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Case study grid ────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-16">

        {user.projects.length === 0 ? (
          // Empty state — no public case studies yet
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-gray-300" />
            </div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              No case studies yet
            </h2>
            <p className="text-gray-400 text-sm">
              {user.name} hasn&apos;t published any case studies yet. Check back soon.
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-8">
              Selected Work ({user.projects.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {user.projects.map(project => {
                // Thumbnail: explicit cover → first image file → null
                const thumbnail = project.caseStudyCoverImage
                  ?? project.files[0]?.url
                  ?? null

                const clientLabel = project.caseStudyHideClient
                  ? 'Private client'
                  : (project.client?.name ?? 'Private client')

                return (
                  <Link
                    key={project.id}
                    href={`/showcase/${project.publicSlug}`}
                    className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-indigo-200 hover:shadow-lg transition-all duration-200"
                  >
                    {/* Thumbnail */}
                    {thumbnail ? (
                      <div className="w-full aspect-video overflow-hidden bg-gray-100">
                        <img
                          src={thumbnail}
                          alt={project.name}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      // Placeholder when no image is available
                      <div className="w-full aspect-video bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                        <span className="text-3xl font-black text-indigo-200">
                          {project.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Card body */}
                    <div className="p-5">
                      {/* Badges */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {project.caseStudyIndustry && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            {project.caseStudyIndustry}
                          </span>
                        )}
                        {project.milestones.length > 0 && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                            {project.milestones.length} milestone{project.milestones.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-gray-900 text-base leading-snug mb-1 group-hover:text-indigo-600 transition-colors">
                        {project.name}
                      </h3>

                      {/* Client */}
                      <p className="text-xs text-gray-500 mb-3">{clientLabel}</p>

                      {/* Outcome snippet — most persuasive content */}
                      {project.caseStudyOutcome && (
                        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                          {project.caseStudyOutcome}
                        </p>
                      )}

                      {/* Tech stack — first 4 only to avoid overflow */}
                      {project.caseStudyTechStack?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {project.caseStudyTechStack.slice(0, 4).map((tech, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-100"
                            >
                              {tech}
                            </span>
                          ))}
                          {project.caseStudyTechStack.length > 4 && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-50 text-gray-400">
                              +{project.caseStudyTechStack.length - 4}
                            </span>
                          )}
                        </div>
                      )}

                      {/* View case study link */}
                      <div className="flex items-center gap-1 mt-4 text-xs font-semibold text-indigo-600 group-hover:gap-2 transition-all">
                        View case study
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </section>

      {/* Footer */}
      <footer className="py-8 text-center bg-white border-t border-gray-100 text-xs text-gray-400">
        Powered by{' '}
        <Link href="/" className="font-bold text-gray-700 hover:text-indigo-600 transition-colors">
          Freeport
        </Link>
        . The client portal for freelance web developers.
      </footer>
    </div>
  )
}