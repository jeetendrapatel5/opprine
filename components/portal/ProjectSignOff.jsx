// components/portal/ProjectSignOff.jsx
// Completion form: the client rates the work and leaves a testimonial. On
// submit the project is marked completed, the testimonial is published to the
// developer's showcase and the developer is notified.
//
// States
//   alreadySubmitted  signed off before: show the saved review
//   successData       just submitted: confirmation and showcase link
//   default           the form
'use client'

import { useId, useState } from 'react'
import { CheckCircle2, ExternalLink, Star } from 'lucide-react'
import axios from 'axios'
import { Button, Card, Eyebrow, FieldLabel, controlClass, focusRing } from './ui'

const STAR_FILL = 'var(--color-fp-portal-accent)'
const STAR_EMPTY = 'var(--color-fp-portal-border-control)'

function Stars({ value }) {
  return (
    <div className="flex justify-center gap-1" role="img" aria-label={`Rated ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className="h-5 w-5"
          fill={star <= value ? STAR_FILL : 'transparent'}
          color={star <= value ? STAR_FILL : STAR_EMPTY}
        />
      ))}
    </div>
  )
}

export default function ProjectSignOff({ projectId, freelancerName, existingRating, existingTestimonial }) {
  const ratingLabelId = useId()
  const testimonialId = useId()

  const [rating, setRating] = useState(existingRating ?? 5)
  const [hoverRating, setHoverRating] = useState(existingRating ?? 5)
  const [testimonial, setTestimonial] = useState(existingTestimonial ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successData, setSuccessData] = useState(null)

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

  // ── Already signed off ────────────────────────────────────────────────────
  if (alreadySubmitted) {
    return (
      <Card as="section" aria-labelledby="signoff-title" className="p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-fp-portal-success" aria-hidden="true" />
        <h2 id="signoff-title" className="font-display text-xl font-medium text-fp-portal-text-primary">
          Project signed off
        </h2>
        <p className="mb-4 mt-1 text-sm text-fp-portal-text-secondary">Thank you for your feedback!</p>
        <Stars value={existingRating ?? 0} />
        {existingTestimonial && (
          <p className="mt-4 rounded-xl border border-fp-portal-border bg-fp-portal-bg px-4 py-3 font-display text-sm italic leading-relaxed text-fp-portal-text-secondary">
            &quot;{existingTestimonial}&quot;
          </p>
        )}
      </Card>
    )
  }

  // ── Just submitted ────────────────────────────────────────────────────────
  if (successData) {
    return (
      <Card as="section" aria-labelledby="signoff-title" role="status" className="p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-fp-portal-success" aria-hidden="true" />
        <h2 id="signoff-title" className="font-display text-xl font-medium text-fp-portal-text-primary">
          Project complete!
        </h2>
        <p className="mb-5 mt-2 text-sm text-fp-portal-text-secondary">
          Thank you for your feedback. {freelancerName} has been notified.
        </p>
        {successData.publicSlug && (
          <Button href={`/showcase/${successData.publicSlug}`} icon={ExternalLink} target="_blank" rel="noopener noreferrer">
            View public showcase
          </Button>
        )}
      </Card>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <Card as="section" aria-labelledby="signoff-title" className="p-5 sm:p-6">
      <h2 id="signoff-title" className="font-display text-xl font-medium text-fp-portal-text-primary">
        Project sign-off
      </h2>
      <p className="mb-6 mt-1 text-sm leading-relaxed text-fp-portal-text-secondary">
        Approve the final deliverables and leave a quick review for {freelancerName}.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Eyebrow id={ratingLabelId} className="mb-2">How was your experience?</Eyebrow>
          <div role="radiogroup" aria-labelledby={ratingLabelId} className="-ml-1 flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => {
              const filled = star <= (hoverRating || rating)
              return (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={rating === star}
                  aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(rating)}
                  onClick={() => {
                    setRating(star)
                    setHoverRating(star)
                  }}
                  className={`rounded-lg p-1 transition-transform duration-100 hover:scale-110 ${focusRing}`}
                >
                  <Star
                    className="h-8 w-8"
                    fill={filled ? STAR_FILL : 'transparent'}
                    color={filled ? STAR_FILL : STAR_EMPTY}
                  />
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <FieldLabel htmlFor={testimonialId}>A brief testimonial</FieldLabel>
          <textarea
            id={testimonialId}
            value={testimonial}
            onChange={(e) => setTestimonial(e.target.value)}
            placeholder={`"Working with ${freelancerName} was great because..."`}
            rows={3}
            className={controlClass}
            required
          />
        </div>

        <Button type="submit" variant="primary" className="w-full" loading={isSubmitting}>
          {isSubmitting ? 'Submitting…' : 'Approve & complete project'}
        </Button>
      </form>
    </Card>
  )
}
