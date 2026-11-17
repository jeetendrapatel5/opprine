// components/portal/FileDeliverables.jsx
// Every project-level file the developer has uploaded, as a grid of tiles with
// image thumbnails. Selecting a tile opens FilePreviewModal on that file, which
// needs state, hence a Client Component.
'use client'

import { useState } from 'react'
import { File } from 'lucide-react'
import { formatSize } from '@/components/dashboard/requests/request-format'
import { fileTypeLabel } from '@/lib/portal-format'
import { Card, CardBody, EmptyState, FileTypeIcon, focusRing } from './ui'
import FilePreviewModal from './FilePreviewModal'
import { cn } from '@/lib/utils'

// Images and PDFs render in the modal; everything else gets a download card.
function isPreviewable(fileType) {
  const mime = (fileType || '').toLowerCase()
  return mime.startsWith('image/') || mime === 'application/pdf'
}

const isImage = (fileType) => (fileType || '').toLowerCase().startsWith('image/')

export default function FileDeliverables({ files }) {
  // null = modal closed; otherwise the index of the open file.
  const [previewIndex, setPreviewIndex] = useState(null)

  if (!files || files.length === 0) {
    return (
      <Card as="section" aria-label="Files">
        <CardBody>
          <EmptyState icon={File} title="No files delivered yet" description="Deliverables will show up here as they are shared." />
        </CardBody>
      </Card>
    )
  }

  return (
    <>
      <section aria-label="Files">
        <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-3">
          {files.map((file, i) => {
            const meta = [formatSize(file.size), fileTypeLabel(file.fileType)].filter(Boolean).join(' · ')
            return (
              <li key={file.id}>
                <button
                  type="button"
                  onClick={() => setPreviewIndex(i)}
                  aria-label={`${isPreviewable(file.fileType) ? 'Preview' : 'View'} ${file.name}`}
                  className={cn(
                    'group block w-full overflow-hidden rounded-2xl border border-fp-portal-border bg-fp-portal-surface text-left shadow-fp-card transition-shadow duration-150 hover:shadow-fp-pop',
                    focusRing,
                  )}
                >
                  <span className="flex h-36 items-center justify-center overflow-hidden bg-fp-portal-raised">
                    {isImage(file.fileType) && file.url ? (
                      <img
                        src={file.url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <FileTypeIcon fileType={file.fileType} className="h-10 w-10 text-fp-portal-text-muted" />
                    )}
                  </span>
                  <span className="block px-4 py-3">
                    <span className="block truncate text-sm font-semibold text-fp-portal-text-primary">{file.name}</span>
                    {meta && <span className="mt-0.5 block text-xs text-fp-portal-text-muted">{meta}</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Rendered through a portal into document.body */}
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
