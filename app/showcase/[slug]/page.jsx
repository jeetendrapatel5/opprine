// app/showcase/[slug]/page.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Public case study page. No auth. No fp- tokens — this is a public
// marketing page with its own light aesthetic, not the dark dashboard.
//
// Two layouts depending on project.caseStudyEnabled:
//   false → MVP layout (testimonial + image grid + lead form)
//   true  → Full story layout (cover hero, narrative, milestone timeline, etc.)
//
// The route stays at /showcase/[slug] — do not change it.
// ClientReviewCard already links here. ProjectSignOff already links here.
// ─────────────────────────────────────────────────────────────────────────────

import { notFound }  from 'next/navigation'
import prisma        from '@/lib/prisma'
import LeadForm      from '@/components/LeadForm'
import {
  Star, CheckCircle2, Quote, Briefcase,
  MapPin, ExternalLink, Code2,
} from 'lucide-react'

// ── SEO metadata ──────────────────────────────────────────────────────────────

export async function generateMetadata({ params }) {
  const { slug } = await params
  const project  = await prisma.project.findUnique({
    where:   { publicSlug: slug },
    include: { user: { select: { name: true } } },
  })
  if (!project) return { title: 'Not Found' }

  const description = project.caseStudyOutcome?.substring(0, 160)
    || project.testimonial?.substring(0, 160)
    || `Verified project by ${project.user.name}.`

  return {
    title:       `${project.name} — Case Study by ${project.user.name}`,
    description,
    openGraph: {
      title:       `${project.name} — Case Study`,
      description,
      type:        'website',
      images:      project.caseStudyCoverImage ? [project.caseStudyCoverImage] : [],
    },
  }
}

// ── Data fetch ────────────────────────────────────────────────────────────────

async function getProject(slug) {
  return prisma.project.findUnique({
    where: { publicSlug: slug, isPublic: true },
    include: {
      user: {
        select: {
          name:          true,
          email:         true,
          bio:           true,
          avatarUrl:     true,
          portfolioUrl:  true,
          username:      true,
        },
      },
      client: {
        select: { name: true },
      },
      files: {
        select: { id: true, name: true, url: true, fileType: true },
        orderBy: { createdAt: 'desc' },
      },
      // Only completed milestones — these form the "how we got there" timeline
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
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className="w-4 h-4"
          fill={s <= (rating ?? 0) ? '#B07633' : 'transparent'}
          color={s <= (rating ?? 0) ? '#B07633' : '#d1d5db'}
        />
      ))}
    </div>
  )
}

function formatDate(date) {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-GB', {
    month: 'short',
    year:  'numeric',
  })
}

// ── MVP layout ────────────────────────────────────────────────────────────────
// The original showcase layout — preserved exactly.
// Shown when caseStudyEnabled is false.

function MvpLayout({ project }) {
  const visualAssets = project.files.filter(f => f.fileType?.startsWith('image/'))
  const clientLabel  = project.client?.name || 'a private client'

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Hero */}
      <section className="bg-white border-b border-gray-200 pt-20 pb-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
            <CheckCircle2 className="w-4 h-4" />
            Verified Completed Project
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-6">
            {project.name}
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-12">
            Delivered by <strong>{project.user.name}</strong> for {clientLabel}.
          </p>

          {project.testimonial && (
            <div className="bg-amber-50/50 rounded-3xl p-8 md:p-12 relative max-w-3xl mx-auto border border-amber-100">
              <Quote className="w-10 h-10 text-amber-200 absolute top-6 left-6" />
              <div className="flex justify-center mb-5">
                <StarRating rating={project.clientRating} />
              </div>
              <p className="text-xl md:text-2xl font-medium text-gray-800 leading-relaxed italic mb-5">
                "{project.testimonial}"
              </p>
              <p className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                — {clientLabel}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Work */}
      {visualAssets.length > 0 && (
        <section className="py-20 max-w-6xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-gray-400 mb-12">
            Final Deliverables
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visualAssets.map(asset => (
              
              <a key={asset.id}
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 aspect-video relative shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all"
              >
                <img
                  src={asset.url}
                  alt={asset.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Lead capture */}
      <section className="bg-gray-900 text-white py-24 px-6 border-t border-gray-800">
        <div className="max-w-xl mx-auto text-center">
          <Briefcase className="w-12 h-12 text-blue-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Want results like this?</h2>
          <p className="text-gray-400 mb-8">
            {project.user.name} is currently accepting new projects.
          </p>
          <LeadForm projectId={project.id} freelancerName={project.user.name} />
        </div>
      </section>

      <footer className="py-8 text-center bg-black text-xs text-gray-500 border-t border-gray-800">
        Powered by{' '}
        <a href="/" className="font-bold text-white hover:text-blue-400 transition-colors">
          Freeport
        </a>
        . The client portal for freelance web developers.
      </footer>
    </div>
  )
}

// ── Full story layout ─────────────────────────────────────────────────────────
// Shown when caseStudyEnabled is true.
// Designed to win prospective clients — every section has a psychological job.

function FullStoryLayout({ project }) {
  const clientLabel = project.caseStudyHideClient
    ? 'A satisfied client'
    : (project.client?.name ?? 'A satisfied client')

  // Hero image priority:
  //   1. Explicit caseStudyCoverImage
  //   2. First completed milestone with a delivery image
  //   3. First project file that is an image
  const heroImage = (() => {
    if (project.caseStudyCoverImage) return project.caseStudyCoverImage
    for (const m of project.milestones) {
      if (m.deliveryFileUrl && m.deliveryFileType?.startsWith('image/')) {
        return m.deliveryFileUrl
      }
    }
    const imgFile = project.files.find(f => f.fileType?.startsWith('image/'))
    return imgFile?.url ?? null
  })()

  // Only image files for the work samples grid
  const visualAssets = project.files.filter(f => f.fileType?.startsWith('image/'))

  return (
    <div className="min-h-screen bg-white">

      {/* ── 1. Hero ──────────────────────────────────────────────────────────── */}
      {/* Full-width cover image with an overlay gradient and project details.    */}
      {/* Psychology: visual impact first. Names, details second.                */}
      <section className="relative">
        {heroImage ? (
          <div className="w-full h-[50vh] min-h-[360px] max-h-[520px] overflow-hidden bg-gray-900">
            <img
              src={heroImage}
              alt={project.name}
              className="w-full h-full object-cover opacity-60"
            />
            {/* Gradient overlay — darkens bottom so text is always readable */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
          </div>
        ) : (
          // No image — solid dark hero so layout doesn't break
          <div className="w-full h-[30vh] min-h-[240px] bg-gray-900" />
        )}

        {/* Project identity — overlaid on the hero */}
        <div className="absolute bottom-0 left-0 right-0 pb-10 px-6">
          <div className="max-w-4xl mx-auto">

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/20 text-green-300 text-xs font-bold uppercase tracking-wider rounded-full border border-green-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified Complete
              </span>
              {project.caseStudyIndustry && (
                <span className="px-3 py-1 bg-white/10 text-white/80 text-xs font-semibold rounded-full border border-white/20">
                  {project.caseStudyIndustry}
                </span>
              )}
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-2">
              {project.name}
            </h1>
            <p className="text-gray-300 text-base">
              by{' '}
              <span className="font-semibold text-white">{project.user.name}</span>
              {' '}· for {clientLabel}
            </p>

          </div>
        </div>
      </section>

      {/* ── 2. Tech stack ────────────────────────────────────────────────────── */}
      {/* Shown right below the hero — establishes credibility with technical    */}
      {/* buyers immediately.                                                    */}
      {project.caseStudyTechStack?.length > 0 && (
        <section className="bg-gray-900 border-b border-gray-800 py-5 px-6">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-3">
            <Code2 className="w-4 h-4 text-gray-500 shrink-0" />
            <div className="flex flex-wrap gap-2">
              {project.caseStudyTechStack.map((tech, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-gray-800 text-gray-300 text-xs font-medium rounded-lg border border-gray-700"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 3. Testimonial ───────────────────────────────────────────────────── */}
      {/* Psychology: social proof before the narrative. The client's voice is   */}
      {/* more persuasive than the freelancer's voice.                           */}
      {project.testimonial && (
        <section className="py-16 px-6 bg-white border-b border-gray-100">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex justify-center mb-4">
              <StarRating rating={project.clientRating} />
            </div>
            <Quote className="w-8 h-8 text-amber-200 mx-auto mb-4" />
            <p className="text-2xl md:text-3xl font-medium text-gray-800 leading-relaxed italic mb-6">
              "{project.testimonial}"
            </p>
            <div className="flex items-center justify-center gap-3">
              {/* Avatar — initial letter in amber */}
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #B07633, #d4954a)' }}
              >
                {clientLabel.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900">{clientLabel}</p>
                <p className="text-xs text-gray-500">Verified client · {project.name}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 4. The Story — Challenge + Outcome ───────────────────────────────── */}
      {/* Two-column narrative on desktop. These are the paragraphs the freelancer */}
      {/* writes. Psychology: problem → solution framing makes the value tangible. */}
      {(project.caseStudyProblem || project.caseStudyOutcome) && (
        <section className="py-16 px-6 bg-gray-50 border-b border-gray-100">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 text-center mb-10">
              The Story
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">

              {project.caseStudyProblem && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <span className="text-red-500 text-xs font-bold">?</span>
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">
                      The Challenge
                    </h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    {project.caseStudyProblem}
                  </p>
                </div>
              )}

              {project.caseStudyOutcome && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <span className="text-green-600 text-xs font-bold">✓</span>
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">
                      The Outcome
                    </h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    {project.caseStudyOutcome}
                  </p>
                </div>
              )}

            </div>
          </div>
        </section>
      )}

      {/* ── 5. Milestone timeline ─────────────────────────────────────────────── */}
      {/* Shows how the project was delivered in stages.                          */}
      {/* Psychology: process transparency builds trust with buyers who fear      */}
      {/* "black box" freelancers who go quiet for weeks.                         */}
      {project.milestones.length > 0 && (
        <section className="py-16 px-6 bg-white border-b border-gray-100">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 text-center mb-10">
              How We Got There
            </h2>

            <div className="relative">
              {/* Vertical spine line */}
              {project.milestones.length > 1 && (
                <div className="absolute left-3 top-3 bottom-3 w-px bg-gray-100" />
              )}

              <div className="space-y-6">
                {project.milestones.map((milestone, index) => (
                  <div key={milestone.id} className="relative flex gap-5">

                    {/* Green check node */}
                    <div className="relative z-10 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </div>

                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {milestone.deliveryHeadline ?? milestone.title}
                        </h3>
                        {milestone.completedAt && (
                          <span className="text-[10px] font-medium text-gray-400 shrink-0">
                            {formatDate(milestone.completedAt)}
                          </span>
                        )}
                      </div>
                      {milestone.deliverySummary && (
                        <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                          {milestone.deliverySummary}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 6. Work samples ──────────────────────────────────────────────────── */}
      {/* Image grid of final deliverables.                                      */}
      {/* Psychology: show, don't just tell. Visual proof closes deals.          */}
      {visualAssets.length > 0 && (
        <section className="py-16 px-6 bg-gray-50 border-b border-gray-100">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 text-center mb-10">
              Final Deliverables
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {visualAssets.map(asset => (
                
                <a key={asset.id}
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 aspect-video relative shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                >
                  <img
                    src={asset.url}
                    alt={asset.name}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 7. Freelancer card ────────────────────────────────────────────────── */}
      {/* Brief "about the builder" section.                                      */}
      {/* Psychology: people hire people, not portfolios.                         */}
      <section className="py-12 px-6 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4">
            {project.user.avatarUrl ? (
              <img
                src={project.user.avatarUrl}
                alt={project.user.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-gray-100 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 text-indigo-600 font-bold text-xl">
                {project.user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900">{project.user.name}</p>
              {project.user.bio && (
                <p className="text-sm text-gray-500 mt-0.5">{project.user.bio}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                {project.user.username && (
                  
                  <a href={`/u/${project.user.username}`}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                  >
                    View portfolio →
                  </a>
                )}
                {project.user.portfolioUrl && (
                  
                  <a href={project.user.portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {project.user.portfolioUrl.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. Lead capture ──────────────────────────────────────────────────── */}
      <section className="bg-gray-900 text-white py-24 px-6">
        <div className="max-w-xl mx-auto text-center">
          <Briefcase className="w-12 h-12 text-blue-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Want results like this?</h2>
          <p className="text-gray-400 mb-8">
            {project.user.name} is currently accepting new projects.
            Send a message directly below.
          </p>
          <LeadForm projectId={project.id} freelancerName={project.user.name} />
        </div>
      </section>

      <footer className="py-8 text-center bg-black text-xs text-gray-500 border-t border-gray-800">
        Powered by{' '}
        <a href="/" className="font-bold text-white hover:text-blue-400 transition-colors">
          Freeport
        </a>
        . The client portal for freelance web developers.
      </footer>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ShowcasePage({ params }) {
  const { slug }  = await params
  const project   = await getProject(slug)

  if (!project) notFound()

  // Route to the correct layout based on whether the story is enabled
  if (project.caseStudyEnabled) {
    return <FullStoryLayout project={project} />
  }

  return <MvpLayout project={project} />
}