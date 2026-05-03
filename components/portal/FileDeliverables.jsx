"use client"

// ─────────────────────────────────────────────────────────────────────────────
// FILE DELIVERABLES
//
// Lists every project-level file the freelancer has uploaded.
// Clicking any row opens FilePreviewModal with that file active.
//
// Changed from Server → Client Component because we need useState to track
// which file is open in the modal. Everything else stays the same.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import {
  File, Download, Image, FileText,
  FileSpreadsheet, FolderArchive, ExternalLink,
} from 'lucide-react'
import FilePreviewModal from './FilePreviewModal'

// ── Helpers ────────────────────────────────────────────────────────────────

function formatSize(bytes) {
  if (!bytes)             return ''
  if (bytes < 1_024)      return `${bytes} B`
  if (bytes < 1_048_576)  return `${(bytes / 1_024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}

// Returns the icon component for a given MIME type
function FileIcon({ fileType, className = 'w-4 h-4' }) {
  const mime = (fileType || '').toLowerCase()

  if (mime.startsWith('image/'))                                  return <Image          className={className} />
  if (mime === 'application/pdf')                                 return <FileText       className={className} />
  if (mime.includes('spreadsheet') || mime.includes('excel'))     return <FileSpreadsheet className={className} />
  if (mime.includes('word')        || mime.includes('document'))  return <FileText       className={className} />
  if (mime.includes('zip')         || mime.includes('compressed'))return <FolderArchive  className={className} />
  return <File className={className} />
}

// Whether the browser can meaningfully preview this type (determines cursor hint)
function isPreviewable(fileType) {
  const mime = (fileType || '').toLowerCase()
  return mime.startsWith('image/') || mime === 'application/pdf'
}

// ── Component ──────────────────────────────────────────────────────────────

export default function FileDeliverables({ files }) {
  // null = modal closed; number = index of the open file
  const [previewIndex, setPreviewIndex] = useState(null)

  if (!files?.length) {
    return (
      <div className="
        bg-fp-portal-surface border border-dashed border-fp-portal-border
        rounded-xl p-6 flex flex-col items-center gap-2
      ">
        <File className="w-6 h-6 text-fp-portal-text-tertiary" />
        <p className="text-fp-portal-text-secondary text-xs">
          No files delivered yet.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-fp-portal-surface border border-fp-portal-border rounded-xl overflow-hidden">
        <div className="divide-y divide-fp-portal-border">
          {files.map((file, i) => {
            const previeable = isPreviewable(file.fileType)

            return (
              <div
                key={file.id}
                // The entire row is clickable — it opens the modal
                onClick={() => setPreviewIndex(i)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setPreviewIndex(i)}
                aria-label={`Preview ${file.name}`}
                className="
                  flex items-center gap-3 px-4 py-3
                  hover:bg-fp-portal-raised
                  transition-colors duration-150
                  cursor-pointer group
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-fp-portal-accent/40
                "
              >
                {/* Icon */}
                <span className="shrink-0 text-fp-portal-accent">
                  <FileIcon fileType={file.fileType} />
                </span>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-fp-portal-text-primary text-xs font-medium truncate leading-tight">
                    {file.name}
                  </p>
                  <p className="text-fp-portal-text-tertiary text-[10px] mt-0.5">
                    {formatSize(file.size)}
                    {file.fileType && ` · ${file.fileType.split('/')[1]?.toUpperCase()}`}
                    {' · '}
                    <span className="text-fp-portal-accent/70">
                      {previeable ? 'Click to preview' : 'Click to view'}
                    </span>
                  </p>
                </div>

                {/* Hover cue — shows on row hover only */}
                <span className="
                  shrink-0 p-1.5 rounded-lg
                  text-fp-portal-text-tertiary
                  group-hover:text-fp-portal-accent group-hover:bg-fp-portal-raised
                  transition-colors duration-150
                ">
                  <ExternalLink className="w-3.5 h-3.5" />
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal — rendered via portal into document.body */}
      {previewIndex !== null && (
        <FilePreviewModal
          files={files}
          activeIndex={previewIndex}
          onNavigate={setPreviewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </>
  )
}
