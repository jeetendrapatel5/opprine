/* eslint-disable @next/next/no-img-element --
   The cover image is a user-supplied URL (Cloudinary or a milestone delivery),
   so next/image's fixed remote-host allow-list does not fit here. */

// components/dashboard/story/StoryPreview.jsx
// ─────────────────────────────────────────────────────────────────────────────
// A read-only mock of the public /showcase/[slug] page.
//
// It is NOT an iframe. It is plain React that draws whatever it receives, so it
// updates on every keystroke without any network request.
//
// Props
//   values          — the editor's current form values (unsaved edits included)
//   project         — the server-fetched project (name, client, milestones…)
//   autoHeroImage   — fallback hero image when no cover has been uploaded
//   host            — the site's host name, shown in the fake address bar
//
// It uses the light "portal" tokens because the public page is read by
// clients and prospects in a light theme, not in the dark dashboard theme.
// ─────────────────────────────────────────────────────────────────────────────

import { CheckCircle2, CheckIcon, ImageIcon, Star } from 'lucide-react'

const MAX_VISIBLE_MILESTONES = 4

// One paragraph of the story, or a dashed placeholder if it is still empty.
function NarrativeBlock({ title, text }) {
  if (!text) {
    return (
      <div className="rounded-lg border border-dashed border-fp-portal-border p-3 text-center text-xs text-fp-portal-text-secondary">
        {title} will appear here
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-fp-portal-text-secondary">{title}</h3>
      <p className="mt-1.5 whitespace-pre-line break-words text-[13px] leading-relaxed text-fp-portal-text-primary">
        {text}
      </p>
    </div>
  )
}

export default function StoryPreview({ values, project, autoHeroImage, host }) {
  const {
    caseStudyEnabled,
    publicSlug,
    caseStudyCoverImage,
    caseStudyIndustry,
    caseStudyTechStack,
    caseStudyHideClient,
    caseStudyProblem,
    caseStudyOutcome,
  } = values

  // Uploaded cover wins; otherwise fall back to the automatic image.
  const heroImage  = caseStudyCoverImage || autoHeroImage
  const clientName = caseStudyHideClient
    ? 'A satisfied client'
    : (project.client?.name ?? 'A satisfied client')
  const rating     = project.clientRating ?? 0
  const shownMilestones = project.milestones.slice(0, MAX_VISIBLE_MILESTONES)
  const hiddenMilestoneCount = project.milestones.length - shownMilestones.length

  return (
    <div className="overflow-hidden rounded-xl border border-fp-border bg-fp-portal-bg text-fp-portal-text-primary">

      {/* Address bar — makes it read as a real page */}
      <div className="flex items-center gap-3 border-b border-fp-portal-border bg-fp-portal-raised px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-fp-portal-border" />
          <span className="size-2.5 rounded-full bg-fp-portal-border" />
          <span className="size-2.5 rounded-full bg-fp-portal-border" />
        </div>
        <p className="min-w-0 flex-1 truncate rounded-md bg-fp-portal-surface px-2.5 py-1 text-[11px] text-fp-portal-text-secondary">
          {host}/showcase/{publicSlug || 'your-project-name'}
        </p>
      </div>

      {/* Page content — scrolls inside the preview if it gets long */}
      <div className="max-h-[640px] overflow-y-auto">

        {/* Hero */}
        {heroImage ? (
          <img
            src={heroImage}
            alt="Story cover"
            className="aspect-video w-full bg-fp-portal-raised object-cover"
          />
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-1.5 bg-fp-portal-raised text-fp-portal-text-secondary">
            <ImageIcon className="size-6" aria-hidden="true" />
            <p className="text-xs">Your cover image appears here</p>
          </div>
        )}

        <div className="space-y-5 p-5">

          {/* Title block */}
          <div>
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-fp-portal-success/10 px-2 py-0.5 text-[11px] font-medium text-fp-portal-success">
                <CheckIcon className="size-3" aria-hidden="true" />
                Verified complete
              </span>
              {caseStudyIndustry && (
                <span className="rounded-full bg-fp-portal-raised px-2 py-0.5 text-[11px] font-medium text-fp-portal-text-secondary">
                  {caseStudyIndustry}
                </span>
              )}
            </div>
            <h2 className="text-lg font-semibold leading-snug tracking-tight">
              {project.name}
            </h2>
            <p className="mt-0.5 text-xs text-fp-portal-text-secondary">
              By {project.user.name} for {clientName}
            </p>
          </div>

          {/* Tech stack */}
          {caseStudyTechStack.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {caseStudyTechStack.map((tech) => (
                <span
                  key={tech}
                  className="rounded-md bg-fp-portal-raised px-2 py-0.5 text-[11px] font-medium text-fp-portal-text-secondary"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}

          {/* Client testimonial (only if the project has one) */}
          {project.testimonial && (
            <figure className="rounded-lg border border-fp-portal-border bg-fp-portal-surface p-3.5">
              {rating > 0 && (
                <div className="mb-2 flex gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      aria-hidden="true"
                      className={`size-3.5 ${
                        star <= rating
                          ? 'fill-fp-portal-accent text-fp-portal-accent'
                          : 'fill-transparent text-fp-portal-border'
                      }`}
                    />
                  ))}
                </div>
              )}
              <blockquote className="line-clamp-3 text-[13px] italic leading-relaxed">
                &ldquo;{project.testimonial}&rdquo;
              </blockquote>
              <figcaption className="mt-2 text-xs font-medium text-fp-portal-text-secondary">
                {clientName}
              </figcaption>
            </figure>
          )}

          <NarrativeBlock title="The challenge" text={caseStudyProblem} />
          <NarrativeBlock title="The outcome"   text={caseStudyOutcome} />

          {/* Completed milestones */}
          {shownMilestones.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-fp-portal-text-secondary">
                How we got there
              </h3>
              <ul className="mt-2 space-y-2">
                {shownMilestones.map((milestone) => (
                  <li key={milestone.id} className="flex items-center gap-2">
                    <CheckCircle2
                      className="size-4 shrink-0 text-fp-portal-success"
                      aria-hidden="true"
                    />
                    <span className="truncate text-[13px]">{milestone.title}</span>
                  </li>
                ))}
              </ul>
              {hiddenMilestoneCount > 0 && (
                <p className="mt-2 pl-6 text-xs text-fp-portal-text-secondary">
                  +{hiddenMilestoneCount} more {hiddenMilestoneCount === 1 ? 'milestone' : 'milestones'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer — says whether this story is set to be public */}
      <div
        className={`border-t px-4 py-2.5 text-center text-xs font-medium ${
          caseStudyEnabled
            ? 'border-fp-portal-border bg-fp-portal-success/10 text-fp-portal-success'
            : 'border-fp-portal-border bg-fp-portal-raised text-fp-portal-text-secondary'
        }`}
      >
        {caseStudyEnabled
          ? 'Visible to anyone with the link'
          : 'Not published. Only you can see this story'}
      </div>
    </div>
  )
}