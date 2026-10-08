// components/portal/ProjectSignOff.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The project completion and testimonial form.
// Shown at the bottom of the right column — only relevant once the project
// is nearly done. The client fills this in, which:
//   1. Marks the project as completed in the DB
//   2. Publishes the client testimonial to the freelancer's showcase
//   3. Notifies the freelancer
//
// States:
//   a) alreadySubmitted — client has already signed off. Show the review.
//   b) successData — client just submitted. Show celebration + showcase link.
//   c) default — show the form.
//
// Design:
// - Amber stars (fp-portal-accent) — gold stars = quality signal
// - "Approve & Complete Project" button: fp-portal-accent (amber) — this
//   is the most positive action in the entire portal. It should feel like
//   an achievement, not a form submission.
// - The already-submitted state shows the review content — reinforces to the
//   client that their feedback was heard and recorded.
// ─────────────────────────────────────────────────────────────────────────────
'use client'

import { useState } from 'react'
import { Star, Loader2, CheckCircle2, ExternalLink } from 'lucide-react'
import axios from 'axios'

export default function ProjectSignOff({
  projectId,
  freelancerName,
  existingRating,
  existingTestimonial,
}) {
  const [rating,       setRating]       = useState(existingRating ?? 5)
  const [hoverRating,  setHoverRating]  = useState(existingRating ?? 5)
  const [testimonial,  setTestimonial]  = useState(existingTestimonial ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successData,  setSuccessData]  = useState(null)

  const alreadySubmitted = !successData && (!!existingRating || !!existingTestimonial)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!testimonial.trim()) {
      alert('Please write a quick sentence about your experience.')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await axios.patch(`/api/projects/${projectId}/publish`, {
        clientRating: rating,
        testimonial,
      })
      setSuccessData(res.data)
    } catch {
      alert('Failed to sign off. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Already submitted state ──────────────────────────────────────────────
  if (alreadySubmitted) {
    return (
      <div className="bg-fp-portal-surface border border-fp-portal-border rounded-xl p-6 text-center">
        <CheckCircle2 className="w-8 h-8 text-fp-portal-success mx-auto mb-3" />
        <h3 className="font-display text-lg font-medium text-fp-portal-text-primary mb-1">
          Project Signed Off
        </h3>
        <p className="text-fp-portal-text-secondary text-xs mb-4">
          Thank you for your feedback!
        </p>
        <div className="flex justify-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map(star => (
            <Star
              key={star}
              className="w-5 h-5"
              fill={star <= (existingRating ?? 0) ? 'var(--color-fp-portal-accent)' : 'transparent'}
              color={star <= (existingRating ?? 0) ? 'var(--color-fp-portal-accent)' : 'var(--color-fp-portal-border)'}
            />
          ))}
        </div>
        {existingTestimonial && (
          <p className="
            font-display italic text-sm text-fp-portal-text-secondary leading-relaxed
            bg-fp-portal-raised border border-fp-portal-border rounded-lg px-4 py-3
          ">
            &quot;{existingTestimonial}&quot;
          </p>
        )}
      </div>
    )
  }

  // ── Just submitted success state ─────────────────────────────────────────
  if (successData) {
    return (
      <div className="bg-fp-portal-surface border border-fp-portal-border rounded-xl p-6 text-center">
        <CheckCircle2 className="w-8 h-8 text-fp-portal-success mx-auto mb-3" />
        <h3 className="font-display text-xl font-medium text-fp-portal-text-primary mb-2">
          Project Complete!
        </h3>
        <p className="text-fp-portal-text-secondary text-sm mb-5">
          Thank you for your feedback. {freelancerName} has been notified.
        </p>
        {successData.publicSlug && (
          <a
            href={`/showcase/${successData.publicSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="
              inline-flex items-center gap-2
              bg-fp-portal-raised border border-fp-portal-border
              text-fp-portal-text-primary text-sm font-medium
              px-5 py-2.5 rounded-xl
              hover:border-fp-portal-accent/30 hover:text-fp-portal-accent
              transition-colors duration-150
            "
          >
            View Public Showcase
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    )
  }

  // ── Sign-off form ─────────────────────────────────────────────────────────
  return (
    <div className="bg-fp-portal-surface border border-fp-portal-border rounded-xl p-6">

      <h2 className="font-display text-xl font-medium text-fp-portal-text-primary mb-1">
        Project Sign-Off
      </h2>
      <p className="text-fp-portal-text-secondary text-sm mb-6 leading-relaxed">
        Approve the final deliverables and leave a quick review for {freelancerName}.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Star rating */}
        <div>
          <label className="block text-xs font-semibold text-fp-portal-text-secondary mb-3">
            How was your experience?
          </label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(rating)}
                onClick={() => setRating(star)}
                className="focus:outline-none transition-transform hover:scale-110 duration-100"
              >
                <Star
                  className="w-7 h-7"
                  fill={star <= (hoverRating || rating) ? 'var(--color-fp-portal-accent)' : 'transparent'}
                  color={star <= (hoverRating || rating) ? 'var(--color-fp-portal-accent)' : 'var(--color-fp-portal-border)'}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div>
          <label className="block text-xs font-semibold text-fp-portal-text-secondary mb-2">
            A brief testimonial
          </label>
          <textarea
            value={testimonial}
            onChange={(e) => setTestimonial(e.target.value)}
            placeholder={`"Working with ${freelancerName} was great because..."`}
            rows={3}
            className="
              w-full bg-fp-portal-raised border border-fp-portal-border
              text-fp-portal-text-primary text-sm rounded-xl px-4 py-3
              placeholder:text-fp-portal-text-tertiary resize-none
              focus:outline-none focus:ring-2 focus:ring-fp-portal-accent/20
              focus:border-fp-portal-accent/40 transition-colors duration-150
            "
            required
          />
        </div>

        {/* Submit — amber primary button for this positive achievement */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="
            w-full flex items-center justify-center gap-2
            bg-fp-portal-accent hover:bg-fp-portal-accent-hover
            text-white text-sm font-bold py-3 rounded-xl
            transition-colors duration-150 disabled:opacity-50
          "
        >
          {isSubmitting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
            : 'Approve & Complete Project'
          }
        </button>

      </form>
    </div>
  )
}