// components/dashboard/milestones/DeliveryModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The modal the freelancer fills out before sending a milestone to the client
// for review. It sets status → IN_REVIEW and populates the delivery card
// fields: headline, summary, checklist, and an optional file highlight.
//
// Design: Dark modal (bg-fp-raised) on a dark backdrop (bg-black/60 blur).
// This is consistent — we're inside the dark dashboard world.
//
// The modal header is sticky so the freelancer always sees which milestone
// they're submitting a review for, even when scrolled down.
//
// The checklist is limited to 3 items intentionally. A 10-item checklist
// overwhelms a non-technical client and gets ignored. Three specific things
// to check = focused, actionable feedback.
// ─────────────────────────────────────────────────────────────────────────────
'use client'

import { useState } from 'react'
import { X, Send, Loader2, ImageIcon, Plus, Trash2 } from 'lucide-react'
import axios from 'axios'

const MAX_CHECKLIST_ITEMS = 3

export default function DeliveryModal({ milestone, fileOptions = [], onSuccess, onClose }) {
  const [headline,       setHeadline]       = useState(milestone.deliveryHeadline ?? '')
  const [summary,        setSummary]        = useState(milestone.deliverySummary  ?? '')
  const [selectedFileId, setSelectedFileId] = useState(null)
  const [isSubmitting,   setIsSubmitting]   = useState(false)

  const [checklist, setChecklist] = useState(
    (milestone.deliveryChecklist ?? []).filter(item => item.trim() !== '')
  )

  const selectedFile = fileOptions.find(f => f.id === selectedFileId) ?? null

  const addChecklistItem = () => {
    if (checklist.length >= MAX_CHECKLIST_ITEMS) return
    setChecklist(prev => [...prev, ''])
  }

  const updateChecklistItem = (index, value) => {
    setChecklist(prev => prev.map((item, i) => i === index ? value : item))
  }

  const removeChecklistItem = (index) => {
    setChecklist(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!headline.trim()) return
    setIsSubmitting(true)
    try {
      const cleanedChecklist = checklist
        .map(item => item.trim())
        .filter(item => item !== '')

      const response = await axios.patch(`/api/milestones/${milestone.id}`, {
        status:            'IN_REVIEW',
        deliveryHeadline:  headline.trim(),
        deliverySummary:   summary.trim(),
        deliveryChecklist: cleanedChecklist,
        deliveryFileUrl:   selectedFile?.fileUrl  ?? null,
        deliveryFileName:  selectedFile?.fileName ?? null,
        deliveryFileType:  selectedFile?.fileType ?? null,
      })

      onSuccess(response.data)
      onClose()
    } catch {
      alert('Failed to send for review. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Shared input class — used for all text inputs inside the modal
  const inputClass = `
    w-full bg-fp-base border border-fp-border text-fp-text-primary
    text-sm rounded-lg px-3 py-2.5
    placeholder:text-fp-text-tertiary
    focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/50
    transition-colors duration-150
  `

  return (
    // Backdrop — clicking outside (on the backdrop itself) closes the modal
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Modal box */}
      <div className="
        bg-fp-raised border border-fp-border rounded-xl shadow-2xl
        w-full max-w-lg max-h-[90vh] overflow-y-auto
      ">

        {/* ── Sticky header ── */}
        {/* sticky top-0 so the milestone name stays visible while scrolling */}
        <div className="
          flex items-center justify-between px-5 py-4
          border-b border-fp-border bg-fp-raised sticky top-0 z-10
        ">
          <div>
            <h2 className="text-fp-text-primary text-sm font-semibold">
              Send for Client Review
            </h2>
            <p className="text-fp-text-tertiary text-xs mt-0.5">
              "{milestone.title}"
            </p>
          </div>
          <button
            onClick={onClose}
            className="
              text-fp-text-tertiary hover:text-fp-text-primary
              p-1.5 rounded-lg hover:bg-fp-surface
              transition-colors duration-150
            "
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-5">

          {/* Headline — required */}
          <div>
            <label className="block text-[10px] font-bold text-fp-text-secondary uppercase tracking-widest mb-1.5">
              Headline <span className="text-fp-danger">*</span>
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Your homepage design is ready for review"
              className={inputClass}
              required
            />
            <p className="text-[10px] text-fp-text-tertiary mt-1">
              Write this for the client, not yourself. No jargon.
            </p>
          </div>

          {/* Summary — optional */}
          <div>
            <label className="block text-[10px] font-bold text-fp-text-secondary uppercase tracking-widest mb-1.5">
              Summary
              <span className="text-fp-text-tertiary font-normal normal-case ml-1">(optional)</span>
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Describe what was done in plain language. What changed, why, and what they should look at."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Checklist — optional, max 3 items */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] font-bold text-fp-text-secondary uppercase tracking-widest">
                What should the client check?
                <span className="text-fp-text-tertiary font-normal normal-case ml-1">(optional)</span>
              </label>
              {checklist.length > 0 && (
                <span className="text-[10px] font-bold text-fp-text-tertiary">
                  {checklist.length} / {MAX_CHECKLIST_ITEMS}
                </span>
              )}
            </div>
            <p className="text-[10px] text-fp-text-tertiary mb-3">
              Give the client specific things to verify. 3 items max — keep it focused.
            </p>

            <div className="space-y-2">
              {checklist.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  {/* Visual checkbox — decorative only, shows client experience */}
                  <div className="w-4 h-4 rounded border-2 border-fp-border shrink-0" />
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateChecklistItem(index, e.target.value)}
                    placeholder={[
                      'Check that the contact form works',
                      'Review the mobile layout on your phone',
                      'Confirm the brand colours match',
                    ][index] ?? 'Add a check item'}
                    maxLength={120}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => removeChecklistItem(index)}
                    className="text-fp-text-tertiary hover:text-fp-danger transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {checklist.length < MAX_CHECKLIST_ITEMS && (
              <button
                type="button"
                onClick={addChecklistItem}
                className="
                  mt-2 flex items-center gap-1.5
                  text-xs text-fp-accent hover:text-fp-accent-hover
                  font-semibold transition-colors duration-150
                "
              >
                <Plus className="w-3.5 h-3.5" />
                Add check item
              </button>
            )}
          </div>

          {/* File highlight — optional */}
          <div>
            <label className="block text-[10px] font-bold text-fp-text-secondary uppercase tracking-widest mb-1.5">
              <ImageIcon className="w-3.5 h-3.5 inline mr-1" />
              Highlight a file
              <span className="text-fp-text-tertiary font-normal normal-case ml-1">(optional)</span>
            </label>

            {fileOptions.length === 0 ? (
              <p className="text-xs text-fp-text-tertiary italic">
                No files attached yet. Post an update with a file first.
              </p>
            ) : (
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="file"
                    value=""
                    checked={selectedFileId === null}
                    onChange={() => setSelectedFileId(null)}
                    className="accent-fp-accent"
                  />
                  <span className="text-sm text-fp-text-tertiary">No file highlight</span>
                </label>

                {fileOptions.map((f) => (
                  <label key={f.id} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="file"
                      value={f.id}
                      checked={selectedFileId === f.id}
                      onChange={() => setSelectedFileId(f.id)}
                      className="accent-fp-accent"
                    />
                    <span className="
                      text-sm text-fp-text-secondary truncate max-w-[280px]
                      group-hover:text-fp-accent transition-colors duration-150
                    ">
                      {f.fileName}
                    </span>
                    {f.fileType?.startsWith('image/') && (
                      <span className="text-[10px] text-fp-accent font-bold">IMAGE</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Image preview — shown when an image file is selected */}
          {selectedFile?.fileType?.startsWith('image/') && (
            <div className="rounded-lg overflow-hidden border border-fp-border">
              <p className="text-[10px] font-bold text-fp-text-tertiary uppercase tracking-widest px-3 py-2 bg-fp-surface">
                Preview
              </p>
              <img
                src={selectedFile.fileUrl}
                alt={selectedFile.fileName}
                className="w-full max-h-40 object-cover"
              />
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="
                flex-1 border border-fp-border text-fp-text-secondary
                text-sm font-medium py-2.5 rounded-lg
                hover:bg-fp-surface hover:text-fp-text-primary
                transition-colors duration-150
              "
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !headline.trim()}
              className="
                flex-1 flex items-center justify-center gap-2
                bg-fp-accent hover:bg-fp-accent-hover text-fp-base
                text-sm font-bold py-2.5 rounded-lg
                transition-colors duration-150 disabled:opacity-50
              "
            >
              {isSubmitting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send    className="w-4 h-4" />
              }
              {isSubmitting ? 'Sending...' : 'Send for Review'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}