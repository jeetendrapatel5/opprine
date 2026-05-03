"use client"

import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Download, ChevronLeft, ChevronRight,
  FileText, FolderArchive, File, FileSpreadsheet,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// FILE PREVIEW MODAL
//
// Renders a fullscreen overlay with a rich preview of the selected file.
// Supports three preview modes:
//
//   image    → full <img> with object-contain, dark backdrop
//   pdf      → <iframe> embed, light backdrop
//   fallback → "no preview" card with large icon + download CTA
//
// Navigation between all files in the list is handled here — parent passes
// the full files array and the current index, not just one file.
//
// Props:
//   files       — File[] (full project file list)
//   activeIndex — index of the currently open file
//   onNavigate  — (newIndex: number) => void
//   onClose     — () => void
// ─────────────────────────────────────────────────────────────────────────────

// ── File type resolution ───────────────────────────────────────────────────

function resolvePreviewMode(fileType) {
  const mime = (fileType || '').toLowerCase()
  if (mime.startsWith('image/'))     return 'image'
  if (mime === 'application/pdf')    return 'pdf'
  return 'fallback'
}

const FALLBACK_ICON_MAP = [
  { test: m => m.includes('spreadsheet') || m.includes('excel'), Icon: FileSpreadsheet, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Spreadsheet' },
  { test: m => m.includes('word') || m.includes('document'),     Icon: FileText,        color: 'text-blue-500',   bg: 'bg-blue-50',    label: 'Document'    },
  { test: m => m.includes('zip') || m.includes('compressed'),    Icon: FolderArchive,   color: 'text-amber-500',  bg: 'bg-amber-50',   label: 'Archive'     },
  { test: m => m === 'application/pdf',                          Icon: FileText,        color: 'text-red-500',    bg: 'bg-red-50',     label: 'PDF'         },
]

function resolveFallbackMeta(fileType) {
  const mime = (fileType || '').toLowerCase()
  const match = FALLBACK_ICON_MAP.find(entry => entry.test(mime))
  return match ?? { Icon: File, color: 'text-fp-portal-text-tertiary', bg: 'bg-fp-portal-raised', label: 'File' }
}

function formatBytes(bytes) {
  if (!bytes) return null
  if (bytes < 1_024)           return `${bytes} B`
  if (bytes < 1_048_576)       return `${(bytes / 1_024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ImagePreview({ file }) {
  return (
    // Dark backdrop makes images pop regardless of their background color
    <div className="flex-1 flex items-center justify-center bg-black/90 p-4 min-h-0">
      <img
        key={file.url}     // remount on file change to avoid stale src flash
        src={file.url}
        alt={file.name}
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        style={{ maxHeight: 'calc(100vh - 120px)' }}
      />
    </div>
  )
}

function PdfPreview({ file }) {
  return (
    <div className="flex-1 bg-fp-portal-raised min-h-0">
      <iframe
        key={file.url}
        src={`${file.url}#toolbar=0&view=FitH`}
        title={file.name}
        className="w-full h-full border-0"
        style={{ height: 'calc(100vh - 120px)' }}
      />
    </div>
  )
}

function FallbackPreview({ file }) {
  const { Icon, color, bg, label } = resolveFallbackMeta(file.fileType)
  const sizeLabel = formatBytes(file.size)

  return (
    <div className="flex-1 flex items-center justify-center bg-fp-portal-bg p-8">
      <div className="bg-fp-portal-surface border border-fp-portal-border rounded-2xl p-10 flex flex-col items-center gap-5 max-w-sm w-full text-center shadow-sm">

        {/* Large icon */}
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${bg}`}>
          <Icon className={`w-10 h-10 ${color}`} />
        </div>

        {/* File info */}
        <div className="space-y-1">
          <p className="font-display text-lg font-semibold text-fp-portal-text-primary leading-snug">
            {file.name}
          </p>
          <p className="text-sm text-fp-portal-text-tertiary">
            {label}{sizeLabel ? ` · ${sizeLabel}` : ''}
          </p>
        </div>

        <p className="text-sm text-fp-portal-text-secondary leading-relaxed">
          This file type can't be previewed in the browser.
        </p>

        {/* Download CTA */}
        <a
          href={file.url}
          download={file.name}
          target="_blank"
          rel="noopener noreferrer"
          className="
            flex items-center gap-2
            bg-fp-portal-accent text-white
            text-sm font-semibold
            px-6 py-3 rounded-xl
            hover:bg-fp-portal-accent-hover
            transition-colors duration-150
          "
        >
          <Download className="w-4 h-4" />
          Download file
        </a>
      </div>
    </div>
  )
}

// ── Main modal ──────────────────────────────────────────────────────────────

export default function FilePreviewModal({ files, activeIndex, onNavigate, onClose }) {
  const file    = files[activeIndex]
  const mode    = resolvePreviewMode(file?.fileType)
  const hasPrev = activeIndex > 0
  const hasNext = activeIndex < files.length - 1

  // Keyboard navigation: Escape → close, ← → → navigate
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape')      onClose()
    if (e.key === 'ArrowLeft'  && hasPrev) onNavigate(activeIndex - 1)
    if (e.key === 'ArrowRight' && hasNext) onNavigate(activeIndex + 1)
  }, [activeIndex, hasPrev, hasNext, onClose, onNavigate])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    // Prevent the page behind from scrolling while modal is open
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  if (!file) return null

  const modal = (
    // ── Backdrop ────────────────────────────────────────────────────────
    <div
      className="fixed inset-0 z-50 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${file.name}`}
    >
      {/* Clickable backdrop behind the header/footer */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal shell — flex column fills the viewport */}
      <div className="relative flex flex-col w-full h-full">

        {/* ── Header ────────────────────────────────────────────────── */}
        <div className={`
          shrink-0 flex items-center justify-between gap-4 px-4 py-3 z-10
          border-b border-white/10
          ${mode === 'image' ? 'bg-black/80 text-white' : 'bg-fp-portal-surface border-fp-portal-border text-fp-portal-text-primary'}
        `}>

          {/* File name + type */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Navigation — only shown when there are multiple files */}
            {files.length > 1 && (
              <span className={`text-xs font-semibold shrink-0 tabular-nums ${mode === 'image' ? 'text-white/50' : 'text-fp-portal-text-tertiary'}`}>
                {activeIndex + 1} / {files.length}
              </span>
            )}
            <p className={`text-sm font-semibold truncate ${mode === 'image' ? 'text-white' : 'text-fp-portal-text-primary'}`}>
              {file.name}
            </p>
            {file.fileType && (
              <span className={`
                shrink-0 text-[10px] font-bold uppercase tracking-wider
                px-1.5 py-0.5 rounded
                ${mode === 'image'
                  ? 'bg-white/15 text-white/70'
                  : 'bg-fp-portal-raised text-fp-portal-text-tertiary border border-fp-portal-border'}
              `}>
                {file.fileType.split('/')[1] ?? file.fileType}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={file.url}
              download={file.name}
              target="_blank"
              rel="noopener noreferrer"
              className={`
                p-2 rounded-lg transition-colors duration-150
                ${mode === 'image'
                  ? 'text-white/60 hover:text-white hover:bg-white/10'
                  : 'text-fp-portal-text-secondary hover:text-fp-portal-text-primary hover:bg-fp-portal-raised'}
              `}
              title="Download"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className={`
                p-2 rounded-lg transition-colors duration-150
                ${mode === 'image'
                  ? 'text-white/60 hover:text-white hover:bg-white/10'
                  : 'text-fp-portal-text-secondary hover:text-fp-portal-text-primary hover:bg-fp-portal-raised'}
              `}
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Preview area ───────────────────────────────────────────── */}
        <div className="flex-1 flex min-h-0 relative">

          {/* Prev arrow */}
          {hasPrev && (
            <button
              onClick={() => onNavigate(activeIndex - 1)}
              className="
                absolute left-3 top-1/2 -translate-y-1/2 z-10
                w-10 h-10 flex items-center justify-center
                bg-black/50 hover:bg-black/70
                text-white rounded-full
                transition-colors duration-150
                backdrop-blur-sm
              "
              aria-label="Previous file"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Next arrow */}
          {hasNext && (
            <button
              onClick={() => onNavigate(activeIndex + 1)}
              className="
                absolute right-3 top-1/2 -translate-y-1/2 z-10
                w-10 h-10 flex items-center justify-center
                bg-black/50 hover:bg-black/70
                text-white rounded-full
                transition-colors duration-150
                backdrop-blur-sm
              "
              aria-label="Next file"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Render correct preview mode */}
          {mode === 'image'    && <ImagePreview    file={file} />}
          {mode === 'pdf'      && <PdfPreview      file={file} />}
          {mode === 'fallback' && <FallbackPreview file={file} />}
        </div>

        {/* ── Footer — thumbnail strip (only when 2+ files) ─────────── */}
        {files.length > 1 && (
          <div className={`
            shrink-0 flex items-center gap-2 px-4 py-2.5 overflow-x-auto
            border-t
            ${mode === 'image'
              ? 'bg-black/80 border-white/10'
              : 'bg-fp-portal-surface border-fp-portal-border'}
          `}>
            {files.map((f, i) => {
              const isActive   = i === activeIndex
              const isImage    = f.fileType?.startsWith('image/')
              const { Icon, color, bg } = resolveFallbackMeta(f.fileType)

              return (
                <button
                  key={f.id}
                  onClick={() => onNavigate(i)}
                  className={`
                    shrink-0 w-12 h-12 rounded-lg overflow-hidden
                    border-2 transition-all duration-150
                    ${isActive
                      ? 'border-fp-portal-accent scale-105'
                      : 'border-transparent opacity-60 hover:opacity-100'}
                  `}
                  aria-label={`Preview ${f.name}`}
                  aria-current={isActive}
                >
                  {isImage ? (
                    <img
                      src={f.url}
                      alt={f.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${bg}`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  // Render outside the normal DOM tree so it's not clipped by any overflow:hidden parent
  return createPortal(modal, document.body)
}
