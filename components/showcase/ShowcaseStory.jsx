/* eslint-disable @next/next/no-img-element --
   Images are user-supplied URLs (Cloudinary), so next/image's fixed
   remote-host allow-list does not fit here. */

// components/showcase/ShowcaseStory.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The content sections of the public showcase page. All server components.
// Each one receives plain data, returns markup, and returns nothing at all if
// it has nothing to show — so the page layout can simply list them in order.
//
//   Hero          — big title, byline, two buttons, cover image
//   ProjectFacts  — client / industry / date / milestones / tech stack
//   Narrative     — "The challenge" and "The outcome"
//   Testimonial   — the client's quote and star rating
//   Process       — numbered list of completed milestones
//   Builder       — who delivered the project
//
// Colours come from the existing light "portal" tokens in globals.css.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import { CheckCircle2, ExternalLink, Star } from 'lucide-react'
import { formatDate, pill, safeExternalUrl } from './showcase-utils'

// The two-column row used by Narrative, Process and Builder:
// a small title on the left, the content on the right (stacked on mobile).
function Row({ title, children }) {
  return (
    <div className="grid gap-4 border-t border-fp-portal-border py-12 md:grid-cols-12 md:gap-8 md:py-20">
      <h2 className="text-sm font-medium text-fp-portal-text-secondary md:col-span-4">{title}</h2>
      <div className="md:col-span-8">{children}</div>
    </div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
export function Hero({ project, clientLabel, industry, image, hasWork }) {
  return (
    <section className="px-6 pb-12 pt-16 text-center md:pb-16 md:pt-24">
      <div className="mx-auto max-w-4xl">

        <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-fp-portal-success/10 px-3 py-1 text-fp-portal-success">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            Verified complete
          </span>
          {industry && (
            <span className="rounded-full bg-fp-portal-raised px-3 py-1 text-fp-portal-text-secondary">
              {industry}
            </span>
          )}
        </div>

        <h1 className="mt-6 text-balance font-display text-4xl font-medium leading-[1.05] tracking-tight text-fp-portal-text-primary sm:text-6xl lg:text-7xl">
          {project.name}
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-lg text-fp-portal-text-secondary md:text-xl">
          Delivered by{' '}
          <span className="font-medium text-fp-portal-text-primary">{project.user.name}</span>{' '}
          for {clientLabel}.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href="#contact" className={pill('solid')}>Start a project</a>
          {hasWork && <a href="#work" className={pill('outline')}>See the work</a>}
        </div>
      </div>

      {image && (
        <div className="mx-auto mt-12 max-w-6xl md:mt-16">
          <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-fp-portal-raised ring-1 ring-fp-portal-border sm:aspect-video">
            <img
              src={image}
              alt={`${project.name} cover`}
              fetchPriority="high"
              className="size-full object-cover"
            />
          </div>
        </div>
      )}
    </section>
  )
}

// ── Facts ─────────────────────────────────────────────────────────────────────
// `items` is [{ label, value }]. Entries without a value are skipped.
export function ProjectFacts({ items, techStack }) {
  const facts = items.filter((item) => item.value)
  if (facts.length === 0 && techStack.length === 0) return null

  return (
    <section className="px-6">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-x-8 gap-y-8 border-t border-fp-portal-border py-10 md:grid-cols-4">
        {facts.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-sm text-fp-portal-text-secondary">{label}</dt>
            <dd className="mt-1 font-display text-xl text-fp-portal-text-primary">{value}</dd>
          </div>
        ))}

        {techStack.length > 0 && (
          <div className="col-span-full">
            <dt className="text-sm text-fp-portal-text-secondary">Built with</dt>
            <dd className="mt-3 flex flex-wrap gap-2">
              {techStack.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-fp-portal-border px-3 py-1 text-sm text-fp-portal-text-primary"
                >
                  {tech}
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>
    </section>
  )
}

// ── Narrative ─────────────────────────────────────────────────────────────────
export function Narrative({ challenge, outcome }) {
  const blocks = [
    { title: 'The challenge', text: challenge },
    { title: 'The outcome',   text: outcome },
  ].filter((block) => block.text)

  if (blocks.length === 0) return null

  return (
    <section className="px-6">
      <div className="mx-auto max-w-6xl">
        {blocks.map(({ title, text }) => (
          <Row key={title} title={title}>
            <p className="max-w-2xl whitespace-pre-line font-display text-2xl leading-[1.45] text-fp-portal-text-primary md:text-[1.75rem]">
              {text}
            </p>
          </Row>
        ))}
      </div>
    </section>
  )
}

// ── Testimonial ───────────────────────────────────────────────────────────────
// Stars only appear when the client actually left a rating.
export function Testimonial({ text, rating, clientLabel }) {
  if (!text) return null

  // Short quotes can be large; long ones step down so they stay readable.
  const sizeClass = text.length > 160 ? 'text-2xl md:text-3xl' : 'text-3xl md:text-5xl'

  return (
    <section className="px-6 py-20 md:py-28">
      <figure className="mx-auto max-w-3xl text-center">
        {rating > 0 && (
          <div
            role="img"
            aria-label={`Rated ${rating} out of 5`}
            className="mb-6 flex justify-center gap-1"
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                aria-hidden="true"
                className={`size-4 ${
                  star <= rating
                    ? 'fill-fp-portal-accent text-fp-portal-accent'
                    : 'fill-transparent text-fp-portal-border'
                }`}
              />
            ))}
          </div>
        )}
        <blockquote
          className={`text-balance font-display leading-snug tracking-tight text-fp-portal-text-primary ${sizeClass}`}
        >
          &ldquo;{text}&rdquo;
        </blockquote>
        <figcaption className="mt-6 text-sm font-medium text-fp-portal-text-secondary">
          {clientLabel}
        </figcaption>
      </figure>
    </section>
  )
}

// ── Process ───────────────────────────────────────────────────────────────────
// Numbered, because the milestones really are a sequence.
export function Process({ milestones }) {
  if (milestones.length === 0) return null

  return (
    <section className="px-6">
      <div className="mx-auto max-w-6xl">
        <Row title="How we got there">
          <ol className="divide-y divide-fp-portal-border">
            {milestones.map((milestone, index) => {
              const date = formatDate(milestone.completedAt)

              return (
                <li key={milestone.id} className="grid grid-cols-[2rem_1fr] gap-x-3 py-6 first:pt-0 last:pb-0">
                  <span className="pt-1 text-sm tabular-nums text-fp-portal-text-secondary">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h3 className="text-lg font-medium text-fp-portal-text-primary">
                        {milestone.deliveryHeadline ?? milestone.title}
                      </h3>
                      {date && (
                        <time
                          dateTime={new Date(milestone.completedAt).toISOString()}
                          className="shrink-0 text-sm text-fp-portal-text-secondary"
                        >
                          {date}
                        </time>
                      )}
                    </div>
                    {milestone.deliverySummary && (
                      <p className="mt-1.5 max-w-xl leading-relaxed text-fp-portal-text-secondary">
                        {milestone.deliverySummary}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </Row>
      </div>
    </section>
  )
}

// ── Builder ───────────────────────────────────────────────────────────────────
export function Builder({ user }) {
  const siteUrl = safeExternalUrl(user.portfolioUrl)

  return (
    <section className="px-6">
      <div className="mx-auto max-w-6xl">
        <Row title="Delivered by">
          <div className="flex items-start gap-5">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="size-16 shrink-0 rounded-full object-cover ring-1 ring-fp-portal-border"
              />
            ) : (
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-fp-portal-raised font-display text-2xl text-fp-portal-text-primary">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <p className="font-display text-2xl text-fp-portal-text-primary">{user.name}</p>
              {user.bio && (
                <p className="mt-2 max-w-xl leading-relaxed text-fp-portal-text-secondary">{user.bio}</p>
              )}
              {(user.username || siteUrl) && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {user.username && (
                    <Link href={`/u/${user.username}`} className={pill('outline', 'sm')}>
                      View portfolio
                    </Link>
                  )}
                  {siteUrl && (
                    <a
                      href={siteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={pill('outline', 'sm')}
                    >
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                      {siteUrl.replace(/^https?:\/\//i, '')}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </Row>
      </div>
    </section>
  )
}