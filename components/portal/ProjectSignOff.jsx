"use client"
import { useState } from 'react'
import { Star, Loader2, CheckCircle, ExternalLink } from 'lucide-react'
import axios from 'axios'

export default function ProjectSignOff({ projectId, freelancerName, existingRating, existingTestimonial }) {
  const [rating, setRating] = useState(existingRating ?? 5)
  const [hoverRating, setHoverRating] = useState(existingRating ?? 5)
  const [testimonial, setTestimonial] = useState(existingTestimonial ?? "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successData, setSuccessData] = useState(null)
  const alreadySubmitted = !successData && (!!existingRating || !!existingTestimonial)


  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!testimonial.trim()) return alert("Please write a quick sentence!")

    setIsSubmitting(true)
    try {
      const res = await axios.patch(`/api/projects/${projectId}/publish`, {
        clientRating: rating,
        testimonial
      })
      setSuccessData(res.data)
    } catch (error) {
      alert("Failed to sign off. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (alreadySubmitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center mt-8">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Project Completed</h3>
        <p className="text-gray-600 mb-2">You already signed off on this project. Thank you!</p>
        <div className="flex justify-center gap-1 my-4">
          {[1, 2, 3, 4, 5].map(star => (
            <Star key={star} className="w-6 h-6" fill={star <= rating ? "#FACC15" : "transparent"} color={star <= rating ? "#FACC15" : "#D1D5DB"} />
          ))}
        </div>
        <p className="text-gray-700 italic text-sm">"{testimonial}"</p>
      </div>
    )
  }

  if (successData) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center mt-8">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Project Officially Completed!</h3>
        <p className="text-gray-600 mb-6">Thank you for your feedback. {freelancerName} has been notified.</p>
        <a
          href={`/showcase/${successData.publicSlug}`}
          target="_blank"
          className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-6 py-3 rounded-xl font-bold transition-all shadow-sm"
        >
          View Public Showcase <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 mt-8 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Project Sign-Off</h2>
      <p className="text-sm text-gray-500 mb-6">
        Please approve the final deliverables and leave a quick review for {freelancerName}.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Star Rating UI */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">How was your experience?</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(rating)}
                onClick={() => setRating(star)}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  className="w-8 h-8"
                  fill={star <= (hoverRating || rating) ? "#FACC15" : "transparent"}
                  color={star <= (hoverRating || rating) ? "#FACC15" : "#D1D5DB"}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Testimonial Input */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Write a brief testimonial
          </label>
          <textarea
            value={testimonial}
            onChange={(e) => setTestimonial(e.target.value)}
            placeholder={`"Working with ${freelancerName} was incredible because..."`}
            className="w-full border border-gray-300 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-h-[100px]"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Approve & Complete Project"}
        </button>
      </form>
    </div>
  )
}