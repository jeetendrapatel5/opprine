// components/portal/FilePreviewModal.jsx
// Fullscreen preview of one file, with navigation across the whole file list.
//
// Preview modes: image (dark backdrop), pdf (iframe), anything else (download card).
// Keyboard: Escape closes, arrow keys move between files, Tab stays inside the
// dialog, and focus returns to whatever opened it.
//
// Props
//   files       the full project file list
//   activeIndex index of the open file
//   onNavigate  (newIndex: number) => void
//   onClose     () => void
'use client'

import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react'
import { formatSize } from '@/components/dashboard/requests/request-format'
import { fileTypeLabel } from '@/lib/portal-format'
import { FileTypeIcon, focusRing } from './ui'

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

function resolvePreviewMode(fileType) {
  const mime = (fileType || '').toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  if (mime === 'application/pdf') return 'pdf'
  return 'fallback'
}

// ── Preview modes ─────────────────────────────────────────────────────────────

function ImagePreview({ file }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-black/90 p-4">
      <img
        key={file.url} // remount on file change to avoid a stale-src flash
        src={file.url}
        alt={file.name}
        className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
        style={{ maxHeight: 'calc(100vh - 120px)' }}
      />
    </div>
  )
}

function PdfPreview({ file }) {
  return (
    <div className="min-h-0 flex-1 bg-fp-portal-raised">
      <iframe
        key={file.url}
        src={`${file.url}#toolbar=0&view=FitH`}
        title={file.name}
        className="h-full w-full border-0"
        style={{ height: 'calc(100vh - 120px)' }}
      />
    </div>
  )
}

function FallbackPreview({ file }) {
  const meta = [fileTypeLabel(file.fileType) || 'File', formatSize(file.size)].filter(Boolean).join(' · ')

  return (
    <div className="flex flex-1 items-center justify-center bg-fp-portal-bg p-6 sm:p-8">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-fp-portal-border bg-fp-portal-surface p-8 text-center shadow-fp-card sm:p-10">
        <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-fp-portal-accent/10 text-fp-portal-accent-strong">
          <FileTypeIcon fileType={file.fileType} className="h-10 w-10" />
        </span>

        <div className="space-y-1">
          <p className="break-words font-display text-lg font-semibold leading-snug text-fp-portal-text-primary">{file.name}</p>
          <p className="text-sm text-fp-portal-text-muted">{meta}</p>
        </div>

        <p className="text-sm leading-relaxed text-fp-portal-text-secondary">
          This file type can&apos;t be previewed in the browser.
        </p>

        <a
          href={file.url}
          download={file.name}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex min-h-11 items-center gap-2 rounded-xl bg-fp-portal-accent-strong px-6 text-sm font-semibold text-white transition-colors hover:bg-fp-portal-accent-strong/90 ${focusRing}`}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download file
        </a>
      </div>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function FilePreviewModal({ files, activeIndex, onNavigate, onClose }) {
  const dialogRef = useRef(null)
  const closeRef = useRef(null)

  const file = files[activeIndex]
  const mode = resolvePreviewMode(file?.fileType)
  const isDark = mode === 'image'
  const hasPrev = activeIndex > 0
  const hasNext = activeIndex < files.length - 1

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(activeIndex - 1)
      if (e.key === 'ArrowRight' && hasNext) onNavigate(activeIndex + 1)

      // Keep Tab inside the dialog.
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(FOCUSABLE)
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    },
    [activeIndex, hasPrev, hasNext, onClose, onNavigate],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    // Stop the page behind from scrolling while the modal is open.
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  // Move focus into the dialog on open and give it back on close.
  useEffect(() => {
    const opener = document.activeElement
    closeRef.current?.focus()
    return () => opener?.focus?.()
  }, [])

  if (!file) return null

  const iconButton = `flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-150 ${focusRing} ${
    isDark
      ? 'text-white/70 hover:bg-white/10 hover:text-white'
      : 'text-fp-portal-text-secondary hover:bg-fp-portal-raised hover:text-fp-portal-text-primary'
  }`

  const arrowButton =
    `absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full ` +
    `bg-black/50 text-white backdrop-blur-sm transition-colors duration-150 hover:bg-black/70 focus-visible:outline-white ${focusRing}`

  const modal = (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${file.name}`}
    >
      {/* Clickable backdrop behind the header and footer */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="relative flex h-full w-full flex-col">
        {/* Header */}
        <div
          className={`z-10 flex shrink-0 items-center justify-between gap-4 border-b px-4 py-2.5 ${
            isDark
              ? 'border-white/10 bg-black/80 text-white'
              : 'border-fp-portal-border bg-fp-portal-surface text-fp-portal-text-primary'
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            {files.length > 1 && (
              <span className={`shrink-0 text-xs font-semibold tabular-nums ${isDark ? 'text-white/60' : 'text-fp-portal-text-muted'}`}>
                {activeIndex + 1} / {files.length}
              </span>
            )}
            <p className="truncate text-sm font-semibold">{file.name}</p>
            {file.fileType && (
              <span
                className={`hidden shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold sm:inline ${
                  isDark
                    ? 'bg-white/15 text-white/80'
                    : 'border border-fp-portal-border bg-fp-portal-raised text-fp-portal-text-secondary'
                }`}
              >
                {fileTypeLabel(file.fileType)}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer" className={iconButton} aria-label={`Download ${file.name}`}>
              <Download className="h-[18px] w-[18px]" aria-hidden="true" />
            </a>
            <button ref={closeRef} type="button" onClick={onClose} className={iconButton} aria-label="Close preview">
              <X className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="relative flex min-h-0 flex-1">
          {hasPrev && (
            <button type="button" onClick={() => onNavigate(activeIndex - 1)} className={`${arrowButton} left-3`} aria-label="Previous file">
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
          {hasNext && (
            <button type="button" onClick={() => onNavigate(activeIndex + 1)} className={`${arrowButton} right-3`} aria-label="Next file">
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          )}

          {mode === 'image' && <ImagePreview file={file} />}
          {mode === 'pdf' && <PdfPreview file={file} />}
          {mode === 'fallback' && <FallbackPreview file={file} />}
        </div>

        {/* Thumbnail strip, only with 2+ files */}
        {files.length > 1 && (
          <div
            className={`flex shrink-0 items-center gap-2 overflow-x-auto border-t px-4 py-2.5 ${
              isDark ? 'border-white/10 bg-black/80' : 'border-fp-portal-border bg-fp-portal-surface'
            }`}
          >
            {files.map((f, i) => {
              const isActive = i === activeIndex

              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onNavigate(i)}
                  className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-150 ${focusRing} ${
                    isActive ? 'scale-105 border-fp-portal-accent' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  aria-label={`Preview ${f.name}`}
                  aria-current={isActive}
                >
                  {f.fileType?.startsWith('image/') ? (
                    <img src={f.url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-fp-portal-accent/10 text-fp-portal-accent-strong">
                      <FileTypeIcon fileType={f.fileType} className="h-5 w-5" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  // Portal into <body> so no overflow:hidden ancestor can clip it.
  return createPortal(modal, document.body)
}
