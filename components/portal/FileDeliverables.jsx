// components/portal/FileDeliverables.jsx
// Every project-level file the developer has uploaded. Selecting a row opens
// FilePreviewModal on that file, which needs state, hence a Client Component.
'use client'

import { useState } from 'react'
import { ChevronRight, File, Package } from 'lucide-react'
import { formatSize } from '@/components/dashboard/requests/request-format'
import { fileTypeLabel } from '@/lib/portal-format'
import { cn } from '@/lib/utils'
import { Card, CardBody, CardHeader, EmptyState, FileTypeIcon, IconTile, focusRing } from './ui'
import FilePreviewModal from './FilePreviewModal'

// Images and PDFs render in the modal; everything else gets a download card.
function isPreviewable(fileType) {
  const mime = (fileType || '').toLowerCase()
  return mime.startsWith('image/') || mime === 'application/pdf'
}

export default function FileDeliverables({ files }) {
  // null = modal closed; otherwise the index of the open file.
  const [previewIndex, setPreviewIndex] = useState(null)
  const hasFiles = files?.length > 0

  return (
    <>
      <Card as="section" id="files" aria-labelledby="files-title" className="scroll-mt-28 overflow-hidden md:scroll-mt-20">
        <CardHeader icon={Package} titleId="files-title" title="Deliverables" count={hasFiles ? files.length : undefined} />

        {hasFiles ? (
          <ul className="divide-y divide-fp-portal-border">
            {files.map((file, i) => {
              const meta = [formatSize(file.size), fileTypeLabel(file.fileType)].filter(Boolean).join(' · ')

              return (
                <li key={file.id}>
                  <button
                    type="button"
                    onClick={() => setPreviewIndex(i)}
                    aria-label={`${isPreviewable(file.fileType) ? 'Preview' : 'View'} ${file.name}`}
                    // Inset outline: the card clips anything drawn outside its edge.
                    className={cn(
                      'group flex min-h-16 w-full items-center gap-3 px-5 py-3 text-left transition-colors duration-150 hover:bg-fp-portal-raised sm:px-6',
                      focusRing,
                      'focus-visible:outline-offset-[-2px]',
                    )}
                  >
                    <IconTile tone="neutral">
                      <FileTypeIcon fileType={file.fileType} className="h-[18px] w-[18px]" />
                    </IconTile>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fp-portal-text-primary">{file.name}</span>
                      {meta && <span className="mt-0.5 block text-xs text-fp-portal-text-muted">{meta}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-fp-portal-text-secondary transition-colors group-hover:text-fp-portal-accent-strong">
                      {isPreviewable(file.fileType) ? 'Preview' : 'View'}
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <CardBody>
            <EmptyState icon={File} title="No files delivered yet" description="Deliverables will show up here as they are shared." />
          </CardBody>
        )}
      </Card>

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
