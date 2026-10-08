// components/dashboard/milestones/DeliveryModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The modal the freelancer fills out before sending a milestone for review.
//
// EXTENDED: Now includes the Decision Map annotation editor.
// When the freelancer selects an image file as the delivery highlight,
// a new "Decision Notes" section appears below the file picker.
// They click anywhere on the image to place a numbered pin, then fill in
// a title and explanation for each pin.
//
// Pins are stored as an array of { id, x, y, title, note } objects.
// x and y are decimal percentages (0.0–1.0) — resolution-independent.
// They are sent to the API as deliveryAnnotations and stored as JSON in the DB.
// ─────────────────────────────────────────────────────────────────────────────
'use client'

import { useState, useRef } from 'react'
import { X, Send, Loader2, ImageIcon, Plus, Trash2, Pencil } from 'lucide-react'
import axios from 'axios'

const MAX_CHECKLIST_ITEMS = 3
const MAX_PINS            = 8

export default function DeliveryModal({ milestone, fileOptions = [], onSuccess, onClose }) {

  // ── Existing state ─────────────────────────────────────────────────────────
  const [headline,       setHeadline]       = useState(milestone.deliveryHeadline ?? '')
  const [summary,        setSummary]        = useState(milestone.deliverySummary  ?? '')
  const [selectedFileId, setSelectedFileId] = useState(null)
  const [isSubmitting,   setIsSubmitting]   = useState(false)

  const [checklist, setChecklist] = useState(
    (milestone.deliveryChecklist ?? []).filter(item => item.trim() !== '')
  )

  // ── New state: annotations ─────────────────────────────────────────────────
  //
  // pins: the array of annotation objects for the currently selected image.
  // Pre-populated from milestone.deliveryAnnotations if they exist — this lets
  // the freelancer re-open the modal on an already-submitted milestone and see
  // their previous pins.
  //
  // editingPinId: the id of the pin whose inline form is currently open.
  // null means no form is open.
  //
  // isImageLoaded: true after the delivery image fires its onLoad event.
  // We don't allow clicks (and don't show pins) until the image is loaded,
  // because getBoundingClientRect() returns wrong values on an unloaded image.
  const [pins,          setPins]          = useState(
    Array.isArray(milestone.deliveryAnnotations) ? milestone.deliveryAnnotations : []
  )
  const [editingPinId,  setEditingPinId]  = useState(null)
  const [isImageLoaded, setIsImageLoaded] = useState(false)

  // imageContainerRef — attached to the div wrapping the image.
  // Used to compute percentage coordinates from a mouse click.
  const imageContainerRef = useRef(null)

  // Derived: the full file object matching the selected radio button
  const selectedFile = fileOptions.find(f => f.id === selectedFileId) ?? null

  // ── File selection ─────────────────────────────────────────────────────────
  // Wraps setSelectedFileId to also reset the image-loaded flag.
  // We reset isImageLoaded because the new image needs to fire onLoad
  // before we allow clicks.
  const handleFileSelect = (fileId) => {
    setSelectedFileId(fileId)
    setIsImageLoaded(false)
  }

  // ── Checklist helpers ──────────────────────────────────────────────────────
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

  // ── Pin helpers ────────────────────────────────────────────────────────────

  // handleImageClick — fires when the freelancer clicks anywhere on the image.
  // Calculates the click position as a percentage of the image dimensions.
  // Clamps to 0.02–0.98 so pins never sit on the very edge.
  // Creates a new pin and immediately opens its edit form.
  const handleImageClick = (e) => {
    if (!isImageLoaded)             return  // image not ready
    if (pins.length >= MAX_PINS)    return  // at cap
    if (!imageContainerRef.current) return

    const rect = imageContainerRef.current.getBoundingClientRect()
    const rawX = (e.clientX - rect.left)  / rect.width
    const rawY = (e.clientY - rect.top)   / rect.height
    const x    = Math.max(0.02, Math.min(0.98, rawX))
    const y    = Math.max(0.02, Math.min(0.98, rawY))

    const newPin = {
      id:    `ann_${Date.now()}`,
      x,
      y,
      title: '',
      note:  '',
    }

    setPins(prev => [...prev, newPin])
    setEditingPinId(newPin.id)
  }

  // updatePin — updates a single field on a single pin by its id.
  const updatePin = (pinId, field, value) => {
    setPins(prev => prev.map(p => p.id === pinId ? { ...p, [field]: value } : p))
  }

  // removePin — deletes a pin and closes its edit form if open.
  const removePin = (pinId) => {
    setPins(prev => prev.filter(p => p.id !== pinId))
    if (editingPinId === pinId) setEditingPinId(null)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!headline.trim()) return
    setIsSubmitting(true)
    try {
      const cleanedChecklist = checklist
        .map(item => item.trim())
        .filter(item => item !== '')

      // Only send annotations when an image file is selected.
      // If the freelancer switches to a non-image or no file, clear annotations.
      const isImageSelected = selectedFile?.fileType?.startsWith('image/')
      const annotationsToSend = isImageSelected ? pins : null

      const response = await axios.patch(`/api/milestones/${milestone.id}`, {
        status:              'IN_REVIEW',
        deliveryHeadline:    headline.trim(),
        deliverySummary:     summary.trim(),
        deliveryChecklist:   cleanedChecklist,
        deliveryFileUrl:     selectedFile?.fileUrl  ?? null,
        deliveryFileName:    selectedFile?.fileName ?? null,
        deliveryFileType:    selectedFile?.fileType ?? null,
        deliveryAnnotations: annotationsToSend,
      })

      onSuccess(response.data)
      onClose()
    } catch {
      alert('Failed to send for review. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  // Count pins that have no explanation — shown as a warning (not a blocker).
  const pinsWithNoNote  = pins.filter(p => !p.note?.trim())
  const showAnnotations = selectedFile?.fileType?.startsWith('image/')

  // ── Shared input class ─────────────────────────────────────────────────────
  const inputClass = `
    w-full bg-fp-base border border-fp-border text-fp-text-primary
    text-sm rounded-lg px-3 py-2.5
    placeholder:text-fp-text-tertiary
    focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/50
    transition-colors duration-150
  `

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="
        bg-fp-raised border border-fp-border rounded-xl shadow-2xl
        w-full max-w-xl max-h-[90vh] overflow-y-auto
      ">

        {/* ── Sticky header ── */}
        <div className="
          flex items-center justify-between px-5 py-4
          border-b border-fp-border bg-fp-raised sticky top-0 z-90
        ">
          <div>
            <h2 className="text-fp-text-primary text-sm font-semibold">
              Send for Client Review
            </h2>
            <p className="text-fp-text-tertiary text-xs mt-0.5">
              &quot;{milestone.title}&quot;
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

          {/* Headline */}
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

          {/* Summary */}
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

          {/* Checklist */}
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
              Give the client specific things to verify. 3 items max keep it focused.
            </p>

            <div className="space-y-2">
              {checklist.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
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

          {/* File highlight */}
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
                    onChange={() => handleFileSelect(null)}
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
                      onChange={() => handleFileSelect(f.id)}
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

          {/* ── Decision Notes — only shown when an image file is selected ── */}
          {showAnnotations && (
            <div>

              {/* Section heading */}
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-bold text-fp-text-secondary uppercase tracking-widest">
                  Decision Notes
                </label>
                {/* Pin count indicator */}
                {pins.length > 0 && (
                  <span className="text-[10px] font-bold text-fp-text-tertiary">
                    {pins.length} / {MAX_PINS} notes added
                  </span>
                )}
              </div>
              <p className="text-[10px] text-fp-text-tertiary mb-3">
                Click anywhere on the image to explain a decision
              </p>

              {/* Annotatable image container
                  ─────────────────────────────────────────────────────────────
                  overflow-hidden + rounded-xl clips the image corners cleanly.
                  Pins near the edges will be partially clipped — acceptable
                  since we clamp coordinates to 0.02–0.98.
                  position: relative is essential for absolute pin positioning.
                  cursor-crosshair signals "you can click here to place pins".
              */}
              <div
                ref={imageContainerRef}
                className="relative overflow-hidden rounded-xl border border-fp-border cursor-crosshair"
                onClick={handleImageClick}
              >
                {/* Loading placeholder — shown while image loads */}
                {!isImageLoaded && (
                  <div className="w-full h-40 flex items-center justify-center bg-fp-surface">
                    <p className="text-xs text-fp-text-tertiary">Loading image...</p>
                  </div>
                )}

                {/* The delivery image */}
                {/* hidden while loading so the placeholder shows instead */}
                <img
                  src={selectedFile.fileUrl}
                  alt={selectedFile.fileName}
                  className={`w-full select-none ${isImageLoaded ? '' : 'hidden'}`}
                  onLoad={() => setIsImageLoaded(true)}
                  // Prevent browser drag of the image, which would interfere
                  // with click coordinate calculation
                  draggable={false}
                />

                {/* Render pins on top of the image */}
                {isImageLoaded && pins.map((pin, index) => {
                  const isActive = editingPinId === pin.id
                  return (
                    <div
                      key={pin.id}
                      // Positions the pin's anchor point at the exact coordinates
                      className="absolute"
                      style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
                    >
                      {/* Pulse ring — centered on the anchor point via translate */}
                      <div
                        className={`
                          absolute w-9 h-9 rounded-full border-2 opacity-60 animate-pulse
                          ${isActive ? 'border-indigo-300' : 'border-indigo-400'}
                        `}
                        style={{ transform: 'translate(-50%, -50%)' }}
                      />

                      {/* Number circle — on top of the ring, z-10 */}
                      <div
                        className={`
                          absolute w-7 h-7 rounded-full flex items-center justify-center
                          text-xs font-bold text-white cursor-pointer z-10
                          transition-transform duration-150 hover:scale-110
                          ${isActive ? 'bg-indigo-700 ring-2 ring-indigo-300' : 'bg-indigo-600'}
                        `}
                        style={{ transform: 'translate(-50%, -50%)' }}
                        onClick={(e) => {
                          // stopPropagation prevents the image container's onClick
                          // from firing and creating a new pin at this location
                          e.stopPropagation()
                          setEditingPinId(isActive ? null : pin.id)
                        }}
                      >
                        {index + 1}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Instruction text — only shown after image loads */}
              {isImageLoaded && (
                <p className="text-[10px] text-fp-text-tertiary mt-1.5">
                  {pins.length >= MAX_PINS
                    ? 'Maximum 8 notes reached. Delete one to add another.'
                    : 'Click on the image to pin a note. Your client will see these as interactive highlights on the delivery.'
                  }
                </p>
              )}

              {/* Pin list — compact rows with edit/delete actions */}
              {pins.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {pins.map((pin, index) => {
                    const isEditing = editingPinId === pin.id
                    return (
                      <div key={pin.id}>

                        {/* Collapsed pin row */}
                        <div className="
                          flex items-center gap-2 p-2 rounded-lg
                          border border-fp-border bg-fp-raised
                          text-sm
                        ">
                          {/* Pin number badge */}
                          <span className="
                            w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px]
                            font-bold flex items-center justify-center shrink-0
                          ">
                            {index + 1}
                          </span>

                          {/* Pin title — shows "Untitled" if empty */}
                          <span className="flex-1 text-fp-text-secondary truncate">
                            {pin.title || <span className="text-fp-text-tertiary italic">Untitled</span>}
                          </span>

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => setEditingPinId(isEditing ? null : pin.id)}
                            className="
                              text-[10px] font-bold text-fp-accent hover:text-fp-accent-hover
                              transition-colors duration-150 shrink-0
                            "
                          >
                            {isEditing ? 'Close' : 'Edit'}
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => removePin(pin.id)}
                            className="
                              text-fp-text-tertiary hover:text-fp-danger
                              transition-colors duration-150 shrink-0
                            "
                            title="Remove this pin"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Inline edit form — shown when this pin is being edited */}
                        {isEditing && (
                          <div className="
                            bg-fp-accent-muted border border-fp-accent/20
                            rounded-xl p-4 mt-1 space-y-3
                          ">
                            {/* Label input */}
                            <div>
                              <label className="
                                block text-[10px] font-bold text-fp-text-secondary
                                uppercase tracking-widest mb-1
                              ">
                                Label
                              </label>
                              <input
                                type="text"
                                value={pin.title}
                                onChange={(e) => updatePin(pin.id, 'title', e.target.value)}
                                maxLength={40}
                                placeholder="e.g. Navigation, Color palette, Mobile layout"
                                className={inputClass}
                              />
                              <p className="text-[10px] text-fp-text-tertiary mt-1">
                                {pin.title.length}/40
                              </p>
                            </div>

                            {/* Explanation textarea */}
                            <div>
                              <label className="
                                block text-[10px] font-bold text-fp-text-secondary
                                uppercase tracking-widest mb-1
                              ">
                                Explanation
                              </label>
                              <textarea
                                value={pin.note}
                                onChange={(e) => updatePin(pin.id, 'note', e.target.value)}
                                maxLength={220}
                                rows={3}
                                placeholder="Why did you make this decision? Write for your client, not for yourself. Plain English only."
                                className={`${inputClass} resize-none`}
                              />
                              <p className="text-[10px] text-fp-text-tertiary mt-1">
                                {pin.note.length}/220
                              </p>
                            </div>

                            {/* Save button — closes the form, pin stays in local state */}
                            <button
                              type="button"
                              onClick={() => setEditingPinId(null)}
                              className="
                                text-xs font-bold
                                bg-fp-accent hover:bg-fp-accent-hover text-fp-base
                                px-3 py-1.5 rounded-lg transition-colors duration-150
                              "
                            >
                              Save note
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Empty note warning — inline, not blocking submission */}
              {/* Only shown if at least one pin has no explanation */}
              {pinsWithNoNote.length > 0 && (
                <p className="text-xs text-fp-warning mt-2">
                  {pinsWithNoNote.length} of your notes {pinsWithNoNote.length === 1 ? 'has' : 'have'} no explanation. Your client will see the pin but nothing to read.
                </p>
              )}

            </div>
          )}
          {/* ── End Decision Notes ── */}

          {/* Actions */}
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