"use client" // Note: If you paste this directly into the Showcase page, that whole page becomes a Client Component. It's better to extract this form into a separate `components/LeadForm.jsx` so the main page stays Server-Rendered.
import { useState } from 'react'
import axios from 'axios'
import { ArrowRight, Loader2, CheckCircle } from 'lucide-react'

export default function LeadForm({ projectId, freelancerName }) {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await axios.post('/api/inquiries', { ...formData, projectId })
      setIsSent(true)
    } catch (error) {
      alert("Failed to send message.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSent) {
    return (
      <div className="bg-white/10 p-8 rounded-3xl border border-white/20 text-center backdrop-blur-sm">
        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Inquiry Sent!</h3>
        <p className="text-gray-300">We&apos;ve notified {freelancerName}. They will be in touch shortly.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/5 p-8 rounded-3xl border border-white/10 text-left backdrop-blur-sm">
      <div className="mb-4">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Your Name</label>
        <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" />
      </div>
      <div className="mb-4">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Email Address</label>
        <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" />
      </div>
      <div className="mb-6">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Project Details</label>
        <textarea rows="3" required value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} placeholder="What do you need built?" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500" />
      </div>

      { error && (
        <p className='text-red-400 text-sm mb-4'>{error}</p>
      )}

      <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-colors flex justify-center items-center gap-2">
        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send Inquiry to {freelancerName} <ArrowRight className="w-4 h-4" /></>}
      </button>
    </form>
  )
}