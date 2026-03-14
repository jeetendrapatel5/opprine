// components/dashboard/milestones/MilestoneUpdateForm.jsx
'use client'

import { useState, useRef } from 'react'
import { Send, Paperclip, X, Loader2 } from 'lucide-react'
import axios from 'axios'

export default function MilestoneUpdateForm({ milestoneId, onSuccess }) {
  const [note, setNote]               = useState('')
  const [file, setFile]               = useState(null)   // File object from input
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    if (selected) setFile(selected)
    // Reset input so the same file can be re-selected after clearing
    e.target.value = ''
  }

  const clearFile = () => setFile(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!note.trim()) return

    setIsSubmitting(true)
    try {
      // FormData lets us send both text and binary file in one request
      const formData = new FormData()
      formData.append('note', note.trim())
      if (file) {
        formData.append('file', file)
      }

      const response = await axios.post(
        `/api/milestones/${milestoneId}/updates`,
        formData,
        // When Content-Type is multipart/form-data, let axios set it automatically
        // (it adds the boundary string that the server needs to parse the parts)
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )

      // Tell parent to add this update to its local state
      onSuccess(response.data)

      // Clear form
      setNote('')
      setFile(null)

    } catch (error) {
      console.error('Failed to post update:', error)
      alert('Failed to post update. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3">
      {/* Note textarea */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What did you work on? What was completed or changed?"
        rows={2}
        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 placeholder:text-gray-400"
      />

      {/* Selected file chip — shown when user has picked a file */}
      {file && (
        <div className="mt-2 inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5 text-xs text-indigo-700 font-medium">
          <Paperclip className="w-3 h-3" />
          <span className="truncate max-w-[180px]">{file.name}</span>
          <button
            type="button"
            onClick={clearFile}
            className="text-indigo-400 hover:text-indigo-700 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Actions row */}
      <div className="flex items-center justify-between mt-2">
        {/* Hidden file input — triggered by the Attach button */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.fig"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <Paperclip className="w-3.5 h-3.5" />
          {file ? 'Change file' : 'Attach file'}
        </button>

        <button
          type="submit"
          disabled={isSubmitting || !note.trim()}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {isSubmitting
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Send className="w-3.5 h-3.5" />
          }
          {isSubmitting ? 'Posting...' : 'Post Update'}
        </button>
      </div>
    </form>
  )
}