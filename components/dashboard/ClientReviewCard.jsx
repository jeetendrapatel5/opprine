'use client'

import { useState } from 'react'
import { Star, Copy, Check, ExternalLink, Quote, ChevronDown } from 'lucide-react'

export default function ClientReviewCard({ project }) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen]     = useState(false)

  const hasReview   = project.clientRating || project.testimonial
  const showcasePath = project.publicSlug ? `/showcase/${project.publicSlug}` : null

  // Builds the full URL — only callable client-side (window access)
  const getFullUrl = () => `${window.location.origin}${showcasePath}`

  const handleCopy = (e) => {
    e.stopPropagation()
    if (!showcasePath) return
    navigator.clipboard.writeText(getFullUrl())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async (e) => {
    e.stopPropagation()
    if (!showcasePath) return
    // Use native share sheet if available (mobile), otherwise fall back to copy
    if (navigator.share) {
      await navigator.share({ title: project.name, url: getFullUrl() })
    } else {
      handleCopy(e)
    }
  }

  // ── Empty state: no review yet ─────────────────────────────────────────
  if (!hasReview) {
    return (
      <div className="border border-dashed border-fp-border rounded-xl p-5 text-center">
        <div className="flex justify-center gap-0.5 mb-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className="w-4 h-4 text-fp-border" />
          ))}
        </div>
        <p className="text-fp-text-secondary text-[11px] font-semibold mb-1">
          Awaiting client review
        </p>
        <p className="text-fp-text-tertiary text-[10px] leading-relaxed max-w-[220px] mx-auto">
          Once your client approves the project and leaves a review, it will appear here.
        </p>
      </div>
    )
  }

  // ── Review card ────────────────────────────────────────────────────────
  return (
    <div className="bg-fp-surface border border-fp-border rounded-xl overflow-hidden">

      {/* ── COLLAPSED HEADER ──
          Shows: live indicator + "Client Review" label + mini star rating.
          The stars give context at a glance even when the card is closed.
      ── */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center cursor-pointer justify-between gap-3 px-4 py-3.5 text-left hover:bg-fp-raised/40 transition-colors duration-150"
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[9px] font-bold text-fp-text-tertiary uppercase tracking-widest">
            {/* Glowing green dot = review exists */}
            <span className="w-1.5 h-1.5 rounded-full bg-fp-success shadow-[0_0_6px_var(--color-fp-success)]" />
            Client Review
          </span>

          {/* Mini star strip — always visible in header */}
          {project.clientRating && (
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className="w-2.5 h-2.5"
                  fill={star <= project.clientRating ? 'var(--color-blue-500)' : 'transparent'}
                  color={star <= project.clientRating ? 'var(--color-blue-500)' : 'var(--color-fp-border)'}
                />
              ))}
            </div>
          )}
        </div>

        <ChevronDown
          className={`
            w-4 h-4 text-fp-text-tertiary
            transition-transform duration-300
            ${open ? 'rotate-180' : 'rotate-0'}
          `}
        />
      </button>

      {/* ── EXPANDED CONTENT ──
          Uses max-h transition. 600px ceiling is generous enough for any testimonial.
      ── */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${open ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="border-t border-fp-border" />

        <div className="px-4 py-4 relative">
          {/* Decorative quote mark — purely visual, pointer-events off */}
          <Quote
            className="absolute top-3 right-4 w-8 h-8 pointer-events-none"
            style={{ color: 'var(--color-fp-accent)', opacity: 0.07 }}
          />

          {/* Star rating + numeric label */}
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className="w-3.5 h-3.5"
                fill={star <= (project.clientRating ?? 0) ? 'var(--color-blue-500)' : 'transparent'}
                color={star <= (project.clientRating ?? 0) ? 'var(--color-blue-500)' : 'var(--color-fp-border)'}
              />
            ))}
            <span
              className="text-[11px] font-bold ml-1.5 tabular-nums"
              style={{ color: 'var(--color-blue-500)' }}
            >
              {project.clientRating}.0
              <span className="font-normal text-fp-text-tertiary"> / 5</span>
            </span>
          </div>

          {/* Testimonial — display/italic font for editorial feel */}
          {project.testimonial && (
            <p className="font-display italic text-xs leading-relaxed text-fp-text-secondary mb-4">
              "{project.testimonial}"
            </p>
          )}

          {/* Attribution row: avatar initial + name + project */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold text-white"
              style={{
                background: 'linear-gradient(135deg, var(--color-fp-portal-accent), var(--color-fp-danger))',
              }}
            >
              {project.client?.name?.[0]?.toUpperCase() ?? 'C'}
            </div>
            <div>
              <p className="text-fp-text-primary text-[11px] font-semibold leading-none">
                {project.client?.name ?? 'Verified Client'}
              </p>
              <p className="text-fp-text-tertiary text-[10px] mt-0.5">
                {project.name}
              </p>
            </div>
          </div>
        </div>

        {/* ── FOOTER: showcase URL + actions ── */}
        {showcasePath && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-fp-border bg-fp-raised/60">
            <span className="text-[10px] text-fp-text-tertiary font-mono truncate">
              {showcasePath}
            </span>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Copy URL */}
              <button
                onClick={handleCopy}
                title="Copy showcase URL"
                className="p-1 rounded text-fp-text-tertiary hover:text-fp-accent transition-colors duration-150"
              >
                {copied
                  ? <Check className="w-3 h-3 text-fp-success" />
                  : <Copy className="w-3 h-3" />
                }
              </button>

              {/* Open showcase page */}
              <a
                href={showcasePath}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="
                  inline-flex items-center gap-1
                  text-[10px] font-bold
                  bg-blue-600 hover:bg-blue-500 text-white
                  rounded-md px-2 py-1
                  transition-colors duration-150
                "
              >
                <ExternalLink className="w-2.5 h-2.5" />
                Showcase
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}