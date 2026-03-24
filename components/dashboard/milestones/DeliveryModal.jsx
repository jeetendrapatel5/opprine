// components/dashboard/milestones/DeliveryModal.jsx
'use client'

import { useState } from 'react'
import { X, Send, Loader2, ImageIcon } from 'lucide-react'
import axios from 'axios'

// fileOptions = the milestoneUpdates that have a file attached
// These are shown as options in the "highlight a file" dropdown
export default function DeliveryModal({ milestone, fileOptions = [], onSuccess, onClose }) {
  const [headline, setHeadline]   = useState(milestone.deliveryHeadline ?? '')
  const [summary,  setSummary]    = useState(milestone.deliverySummary  ?? '')
  const [selectedFileId, setSelectedFileId] = useState(null)
  const [isSubmitting, setIsSubmitting]     = useState(false)

  // Find the full file object for the selected option
  const selectedFile = fileOptions.find(f => f.id === selectedFileId) ?? null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!headline.trim()) return

    setIsSubmitting(true)
    try {
      const response = await axios.patch(`/api/milestones/${milestone.id}`, {
        // Move to IN_REVIEW and save the delivery card data in one request
        status:           'IN_REVIEW',
        deliveryHeadline: headline.trim(),
        deliverySummary:  summary.trim(),
        // Only send file fields if the freelancer picked a file
        deliveryFileUrl:  selectedFile?.fileUrl  ?? null,
        deliveryFileName: selectedFile?.fileName ?? null,
        deliveryFileType: selectedFile?.fileType ?? null,
      })

      // Tell the parent the update succeeded, pass back the updated milestone
      onSuccess(response.data)
      onClose()

    } catch {
      alert('Failed to send for review. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    // Backdrop — clicking outside closes the modal
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Send for Client Review</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              "{milestone.title}"
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Headline — what the client reads first */}
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

          {/* Summary — plain English explanation */}
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

          {/* File highlight — pick one file to feature prominently */}
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
                {/* "None" option */}
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

                {/* One radio per file that has a URL */}
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

          {/* Preview of how it'll look — only if image is selected */}
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

          {/* Actions */}
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
                : <Send className="w-4 h-4" />
              }
              {isSubmitting ? 'Sending...' : 'Send for Review'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}