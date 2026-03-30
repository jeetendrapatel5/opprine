// components/dashboard/milestones/MilestoneUpdateForm.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The inline form for posting a new milestone update.
// Handles text + optional file attachment in a single multipart/form-data POST.
//
// Design: The textarea recedes into the dark surface — bg-fp-raised means
// it's one level above the surface it sits on, which creates the visual
// "input field is waiting" signal without needing a bright border.
//
// The file chip (shown after picking a file) uses accent colors because it's
// a positive action ("I've attached something") not a warning.
// ─────────────────────────────────────────────────────────────────────────────
'use client'

import { useState, useRef } from 'react'
import { Send, Paperclip, X, Loader2 } from 'lucide-react'
import axios from 'axios'

export default function MilestoneUpdateForm({ milestoneId, onSuccess }) {
  const [note,         setNote]         = useState('')
  const [file,         setFile]         = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    if (selected) setFile(selected)
    // Reset so the same file can be re-selected after clearing
    e.target.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!note.trim()) return
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('note', note.trim())
      if (file) formData.append('file', file)

      const response = await axios.post(
        `/api/milestones/${milestoneId}/updates`,
        formData,
        // Let axios set Content-Type automatically — it adds the boundary
        // string that the server needs to parse multipart data correctly.
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )

      onSuccess(response.data)
      setNote('')
      setFile(null)
    } catch {
      alert('Failed to post update. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>

      {/* Textarea — recedes into the dark surface */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What did you work on? What changed or was completed?"
        rows={2}
        className="
          w-full bg-fp-raised border border-fp-border text-fp-text-primary
          text-sm rounded-lg px-3 py-2 resize-none
          placeholder:text-fp-text-tertiary
          focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/50
          transition-colors duration-150
        "
      />

      {/* File chip — shown when a file is selected */}
      {file && (
        <div className="
          mt-2 inline-flex items-center gap-2
          bg-fp-accent-muted border border-fp-accent/20
          rounded-lg px-2.5 py-1.5 text-xs text-fp-accent font-medium
        ">
          <Paperclip className="w-3 h-3" />
          <span className="truncate max-w-[180px]">{file.name}</span>
          <button
            type="button"
            onClick={() => setFile(null)}
            className="text-fp-accent/60 hover:text-fp-accent transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Actions: attach + submit */}
      <div className="flex items-center justify-between mt-2">

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
          className="
            flex items-center gap-1.5 text-xs
            text-fp-text-tertiary hover:text-fp-accent
            transition-colors duration-150
          "
        >
          <Paperclip className="w-3.5 h-3.5" />
          {file ? 'Change file' : 'Attach file'}
        </button>

        <button
          type="submit"
          disabled={isSubmitting || !note.trim()}
          className="
            flex items-center gap-1.5
            bg-fp-accent hover:bg-fp-accent-hover text-fp-base
            text-xs font-bold px-3 py-1.5 rounded-lg
            transition-colors duration-150 disabled:opacity-50
          "
        >
          {isSubmitting
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Send    className="w-3.5 h-3.5" />
          }
          {isSubmitting ? 'Posting...' : 'Post Update'}
        </button>

      </div>
    </form>
  )
}