// components/dashboard/milestones/DeliveryModal.jsx
'use client'

import { useState } from 'react'
import { X, Send, Loader2, ImageIcon, Plus, Trash2 } from 'lucide-react'
import axios from 'axios'

// Maximum number of checklist items the freelancer can add.
// Keeping it at 3 forces them to be specific — a 10-item checklist
// is overwhelming for a client who doesn't understand technical work.
const MAX_CHECKLIST_ITEMS = 3

export default function DeliveryModal({ milestone, fileOptions = [], onSuccess, onClose }) {
  const [headline,   setHeadline]   = useState(milestone.deliveryHeadline ?? '')
  const [summary,    setSummary]    = useState(milestone.deliverySummary  ?? '')
  const [selectedFileId, setSelectedFileId] = useState(null)
  const [isSubmitting,   setIsSubmitting]   = useState(false)

  // Checklist state — array of strings.
  // Pre-populate from saved data if the freelancer previously saved a draft.
  // Filter out empty strings so stale empty items don't appear on re-open.
  const [checklist, setChecklist] = useState(
    (milestone.deliveryChecklist ?? []).filter(item => item.trim() !== '')
  )

  const selectedFile = fileOptions.find(f => f.id === selectedFileId) ?? null

  // ── Checklist helpers ─────────────────────────────────────────────────────

  // Add a new empty input slot (up to the max)
  const addChecklistItem = () => {
    if (checklist.length >= MAX_CHECKLIST_ITEMS) return
    setChecklist(prev => [...prev, ''])
  }

  // Update the text of one item by its index in the array
  // We use index because checklist items have no ID — they're just strings
  const updateChecklistItem = (index, value) => {
    setChecklist(prev => prev.map((item, i) => i === index ? value : item))
  }

  // Remove one item by index — filters it out, re-indexes automatically
  const removeChecklistItem = (index) => {
    setChecklist(prev => prev.filter((_, i) => i !== index))
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!headline.trim()) return

    setIsSubmitting(true)
    try {
      // Filter out any checklist items the freelancer left blank.
      // We don't want to save ["Check the form", "", "Review mobile layout"]
      // — the empty string in the middle is meaningless to the client.
      const cleanedChecklist = checklist
        .map(item => item.trim())
        .filter(item => item !== '')

      const response = await axios.patch(`/api/milestones/${milestone.id}`, {
        status:            'IN_REVIEW',
        deliveryHeadline:  headline.trim(),
        deliverySummary:   summary.trim(),
        deliveryChecklist: cleanedChecklist,
        // File fields — null if no file was selected (clears any previous value)
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* max-h + overflow-y-auto makes the modal scrollable on small screens */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-bold text-gray-900">Send for Client Review</h2>
            <p className="text-xs text-gray-500 mt-0.5">"{milestone.title}"</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* ── Headline ── */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Headline <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Your homepage design is ready for review"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
              required
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Write this for the client, not yourself. No jargon.
            </p>
          </div>

          {/* ── Summary ── */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              Summary <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Describe what was done in plain language. What changed, why, and what the client should look at."
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-none"
            />
          </div>

          {/* ── Checklist ── */}
          {/* This is the new section for Feature 4.1 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                What should the client check?{' '}
                <span className="text-gray-400">(optional)</span>
              </label>
              {/* Item counter — shows "2 / 3" so freelancer knows the limit */}
              {checklist.length > 0 && (
                <span className="text-[10px] font-bold text-gray-400">
                  {checklist.length} / {MAX_CHECKLIST_ITEMS}
                </span>
              )}
            </div>

            <p className="text-[10px] text-gray-400 mb-3">
              Give the client specific things to verify before approving. Keep it simple.
            </p>

            {/* Existing checklist items */}
            <div className="space-y-2">
              {checklist.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  {/* Visual checkbox — not interactive, just decorative */}
                  {/* It signals to the freelancer "this is what the client sees" */}
                  <div className="w-4 h-4 rounded border-2 border-gray-300 shrink-0" />

                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateChecklistItem(index, e.target.value)}
                    placeholder={`e.g. ${[
                      'Check that the contact form submits correctly',
                      'Review the mobile layout on your phone',
                      'Confirm the brand colours match',
                    ][index] ?? 'Add a check item'}`}
                    maxLength={120}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                  />

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeChecklistItem(index)}
                    className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                    title="Remove this item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add item button — hidden once max is reached */}
            {checklist.length < MAX_CHECKLIST_ITEMS && (
              <button
                type="button"
                onClick={addChecklistItem}
                className="mt-2 flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700 font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add check item
              </button>
            )}
          </div>

          {/* ── File highlight ── */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
              <ImageIcon className="w-3.5 h-3.5 inline mr-1" />
              Highlight a file <span className="text-gray-400">(optional)</span>
            </label>

            {fileOptions.length === 0 ? (
              <p className="text-xs text-gray-400 italic">
                No files attached to this milestone yet. Post an update with a file first.
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
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-gray-500">No file highlight</span>
                </label>

                {fileOptions.map((f) => (
                  <label key={f.id} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="file"
                      value={f.id}
                      checked={selectedFileId === f.id}
                      onChange={() => setSelectedFileId(f.id)}
                      className="accent-indigo-600"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-indigo-600 transition-colors truncate max-w-[300px]">
                      {f.fileName}
                    </span>
                    {f.fileType?.startsWith('image/') && (
                      <span className="text-[10px] text-indigo-400 font-bold">IMAGE</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Image preview */}
          {selectedFile?.fileType?.startsWith('image/') && (
            <div className="rounded-xl overflow-hidden border border-indigo-100 bg-indigo-50">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide px-3 pt-2">
                Preview
              </p>
              <img
                src={selectedFile.fileUrl}
                alt={selectedFile.fileName}
                className="w-full max-h-40 object-cover mt-1"
              />
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !headline.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
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