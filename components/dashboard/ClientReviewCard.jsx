// components/dashboard/ClientReviewCard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Shows the client's testimonial and star rating once a project is completed.
// Before a review exists, shows an empty state explaining what will appear here.
//
// This card was previously written with an inline <style> tag using raw CSS.
// PROBLEM with that approach: inline styles bypass the design system entirely —
// any token change in globals.css has no effect on the component.
// SOLUTION: Rewritten using only Tailwind + fp tokens. Every color and spacing
// value now comes from the design system.
//
// The dark card aesthetic is kept — it's intentional (the ClientReviewCard sits
// in the dark dashboard), and now implemented via fp tokens instead of hardcoded
// hex values like `#0F0F0F`.
//
// The amber accent (`fp-portal-accent` / `#B07633`) is used for the stars because
// gold/amber = quality, value, achievement. It's also the portal's accent color,
// so the review card feels like it belongs to the client-facing world.
// ─────────────────────────────────────────────────────────────────────────────
'use client'

import { useState } from 'react'
import { Star, Copy, Check, ExternalLink, Share2, Quote } from 'lucide-react'

export default function ClientReviewCard({ project }) {
  const [copied, setCopied] = useState(false)

  const hasReview   = project.clientRating || project.testimonial
  const showcasePath = project.publicSlug ? `/showcase/${project.publicSlug}` : null

  // Build the full URL only inside browser event handlers — window is not
  // available during server-side rendering, so we can't reference it at the
  // top level of the component.
  const getFullUrl = () => `${window.location.origin}${showcasePath}`

  const handleCopy = () => {
    if (!showcasePath) return
    navigator.clipboard.writeText(getFullUrl())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (!showcasePath) return
    if (navigator.share) {
      await navigator.share({ title: project.name, url: getFullUrl() })
    } else {
      handleCopy()
    }
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  // Shown before the project has a review. Uses a dashed border (invitation
  // style) and muted colors — it's not a broken state, just a future state.
  if (!hasReview) {
    return (
      <div className="
        border border-dashed border-fp-border rounded-xl p-6 text-center
      ">
        <div className="flex justify-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} className="w-5 h-5 text-fp-border" />
          ))}
        </div>
        <p className="text-fp-text-secondary text-xs font-semibold mb-1">
          Awaiting client sign-off
        </p>
        <p className="text-fp-text-tertiary text-xs leading-relaxed max-w-[240px] mx-auto">
          Once your client approves and leaves a review, it will appear here.
        </p>
      </div>
    )
  }

  // ── Review card ────────────────────────────────────────────────────────────
  return (
    // Dark surface with a subtle amber top line — premium presentation
    <div className="bg-fp-surface border border-fp-border rounded-xl overflow-hidden relative">

      {/* Amber top accent line — signals "this is gold, this is an achievement" */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-fp-portal-accent to-transparent opacity-80" />

      {/* ── Card header: badge + share actions ── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-fp-border flex-wrap gap-2">

        {/* Live badge — signals this is real, published content */}
        <span className="flex items-center gap-2 text-[10px] font-bold text-fp-text-tertiary uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-fp-success shadow-[0_0_6px_var(--color-fp-success)]" />
          Client Review
        </span>

        {/* Share actions — only shown if a showcase page exists */}
        {showcasePath && (
          <div className="flex items-center gap-1.5">

            <button
              onClick={handleCopy}
              className="
                inline-flex items-center gap-1 text-fp-text-tertiary text-xs font-medium
                bg-fp-raised border border-fp-border rounded-lg px-2.5 py-1
                hover:text-fp-text-secondary hover:border-fp-accent/20
                transition-colors duration-150
              "
            >
              {copied
                ? <><Check className="w-3 h-3 text-fp-success" /> Copied!</>
                : <><Copy  className="w-3 h-3" /> Copy</>
              }
            </button>

            <a
              href={showcasePath}
              target="_blank"
              rel="noopener noreferrer"
              className="
                inline-flex items-center gap-1 text-fp-base text-xs font-semibold
                bg-[var(--color-fp-portal-accent)] hover:bg-[var(--color-fp-portal-accent-hover)]
                rounded-lg px-2.5 py-1 transition-colors duration-150
              "
            >
              <ExternalLink className="w-3 h-3" />
              Showcase
            </a>

          </div>
        )}
      </div>

      {/* ── Review body ── */}
      <div className="px-5 py-5 relative">

        {/* Decorative quote icon — ambient, not interactive */}
        <Quote className="absolute top-4 right-4 w-8 h-8 text-[var(--color-fp-portal-accent)]/10 pointer-events-none" />

        {/* Star rating */}
        <div className="flex items-center gap-1 mb-4">
          {[1, 2, 3, 4, 5].map(star => (
            <Star
              key={star}
              className="w-4 h-4"
              fill={star <= (project.clientRating ?? 0) ? 'var(--color-fp-portal-accent)' : 'transparent'}
              color={star <= (project.clientRating ?? 0) ? 'var(--color-fp-portal-accent)' : 'var(--color-fp-border)'}
            />
          ))}
          <span className="text-xs font-bold ml-1.5" style={{ color: 'var(--color-fp-portal-accent)' }}>
            {project.clientRating}.0 / 5
          </span>
        </div>

        {/* Testimonial text — Fraunces italic for the premium editorial feel */}
        {project.testimonial && (
          <p className="
            font-display italic text-sm leading-relaxed
            text-fp-text-secondary mb-5
          ">
            "{project.testimonial}"
          </p>
        )}

        {/* Client attribution */}
        <div className="flex items-center gap-3">
          {/* Avatar — initial letter in a warm amber gradient box */}
          <div className="
            w-8 h-8 rounded-lg flex items-center justify-center shrink-0
            text-sm font-bold text-white
          " style={{ background: 'linear-gradient(135deg, var(--color-fp-portal-accent), var(--color-fp-danger))' }}>
            {project.client?.name?.[0]?.toUpperCase() ?? 'C'}
          </div>
          <div>
            <p className="text-fp-text-primary text-xs font-semibold">
              {project.client?.name ?? 'Verified Client'}
            </p>
            <p className="text-fp-text-tertiary text-[10px]">
              Client · {project.name}
            </p>
          </div>
        </div>

      </div>

      {/* ── Showcase URL strip ── */}
      {showcasePath && (
        <div className="
          flex items-center justify-between gap-3
          px-5 py-3 border-t border-fp-border
          bg-fp-raised
        ">
          <span className="text-[10px] text-fp-text-tertiary font-mono truncate">
            {showcasePath}
          </span>
          <button
            onClick={handleCopy}
            className="text-fp-text-tertiary hover:text-[var(--color-fp-portal-accent)] transition-colors duration-150 shrink-0 p-1 rounded"
          >
            {copied
              ? <Check className="w-3 h-3 text-fp-success" />
              : <Copy  className="w-3 h-3" />
            }
          </button>
        </div>
      )}
    </div>
  )
}