'use client'

import { useState } from 'react'
import { Star, Copy, Check, ExternalLink, Quote, ChevronDown } from 'lucide-react'

export default function ClientReviewCard({ project }) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  const hasReview = project.clientRating || project.testimonial
  const showcasePath = project.publicSlug ? `/showcase/${project.publicSlug}` : null

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
    if (navigator.share) {
      await navigator.share({ title: project.name, url: getFullUrl() })
    } else {
      handleCopy(e)
    }
  }

  if (!hasReview) {
    return (
      <div className="border border-dashed border-fp-border rounded-xl p-6 text-center">
        <div className="flex justify-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((i) => (
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

  return (
    <div className="bg-fp-surface rounded-xl overflow-hidden relative">
      {/* Clickable header */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left"
      >
        <span className="flex items-center gap-2 text-[10px] font-bold text-fp-text-tertiary uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-fp-success shadow-[0_0_6px_var(--color-fp-success)]" />
          Client Review
        </span>

        <ChevronDown
          className={`w-4 h-4 text-fp-text-tertiary transition-transform duration-300 ${
            open ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>

      {/* Sliding content */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${open ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className='border-b border-fp-border'></div>
        <div className="px-5 py-5 relative">
          <Quote className="absolute top-4 right-4 w-8 h-8 text-[var(--color-fp-portal-accent)]/10 pointer-events-none" />

          <div className="flex items-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className="w-4 h-4"
                fill={star <= (project.clientRating ?? 0) ? 'var(--color-blue-500)' : 'transparent'}
                color={star <= (project.clientRating ?? 0) ? 'var(--color-blue-500)' : 'var(--color-fp-border)'}
              />
            ))}
            <span className="text-xs font-bold ml-1.5" style={{ color: 'var(--color-blue-500)' }}>
              {project.clientRating}.0 / 5
            </span>
          </div>

          {project.testimonial && (
            <p className="font-display italic text-sm leading-relaxed text-fp-text-secondary mb-5">
              "{project.testimonial}"
            </p>
          )}

          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold text-white"
              style={{
                background:
                  'linear-gradient(135deg, var(--color-fp-portal-accent), var(--color-fp-danger))',
              }}
            >
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

        {showcasePath && (
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-fp-border bg-fp-raised">
            <span className="text-[10px] text-fp-text-tertiary font-mono truncate">
              {showcasePath}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="text-fp-text-tertiary hover:text-[var(--color-fp-portal-accent)] transition-colors duration-150 shrink-0 p-1 rounded"
              >
                {copied ? <Check className="w-3 h-3 text-fp-success" /> : <Copy className="w-3 h-3" />}
              </button>

              <a
                href={showcasePath}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 hover:text-white text-neutral-300 rounded-lg px-2.5 py-1 transition-colors duration-150"
              >
                <ExternalLink className="w-3 h-3" />
                Showcase
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}