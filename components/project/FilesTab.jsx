'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Clock, Loader2, Upload, File, Image, FileCode2, FileSpreadsheet, FileText, FolderArchive } from 'lucide-react'
import axios from 'axios'

function formatSize(bytes) {
  if (bytes < 1024)          return `${bytes} B`
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileExtension(name) {
  return name?.split('.').pop()?.toLowerCase()
}

// Corrected from the original: PDFs were mapped to FileCode2 (a code-file
// icon), which is a visual lie for a client-facing deliverable. Extension
// is now checked as a fallback alongside MIME type, since some upload
// pipelines don't always set fileType reliably.
function FileIcon({ fileType, fileName }) {
  const cls = 'w-4 h-4 text-fp-accent'
  const ext = fileExtension(fileName)

  if (fileType?.startsWith('image/')) return <Image className={cls} />

  if (fileType?.includes('spreadsheet') || fileType?.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext))
    return <FileSpreadsheet className={cls} />

  if (fileType?.includes('zip') || fileType?.includes('compressed') || ['zip', 'rar', '7z'].includes(ext))
    return <FolderArchive className={cls} />

  if (['js', 'ts', 'jsx', 'tsx', 'json', 'py', 'html', 'css'].includes(ext))
    return <FileCode2 className={cls} />

  if (
    fileType === 'application/pdf' ||
    fileType?.includes('word') ||
    fileType?.includes('document') ||
    ['pdf', 'doc', 'docx'].includes(ext)
  )
    return <FileText className={cls} />

  return <File className={cls} />
}

export default function FilesTab({ project }) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)
  const dragCounter = useRef(0)
  const router = useRouter()

  // Shared by the file picker AND drag-and-drop. Uploads files one at a
  // time to your existing single-file endpoint, so selecting/dropping
  // several files at once works with zero backend changes.
  const uploadFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList ?? [])
    if (files.length === 0) return

    setIsUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        setUploadStatus(files.length > 1 ? `Uploading ${i + 1} of ${files.length}...` : 'Uploading...')
        const formData = new FormData()
        formData.append('file', files[i])
        formData.append('projectId', project.id)
        await axios.post(`/api/projects/${project.id}/files`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }
      router.refresh()
    } catch {
      alert('Failed to upload one or more files. Please try again.')
    } finally {
      setIsUploading(false)
      setUploadStatus('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [project.id, router])

  const handleFileChange = (e) => uploadFiles(e.target.files)

  // Browsers fire dragenter/dragleave every time the cursor crosses into or
  // out of a CHILD element too, not just the outer container — so a naive
  // "set isDragging true/false" flickers the highlight as you drag over
  // rows. Counting enters vs. leaves avoids that.
  const handleDragEnter = (e) => {
    e.preventDefault()
    dragCounter.current += 1
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setIsDragging(false)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault() // required, or the browser blocks the drop entirely
  }

  const handleDrop = (e) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragging(false)
    uploadFiles(e.dataTransfer.files)
  }

  const files = project.files ?? []

  return (
    <div
      className="space-y-4"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >

      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-fp-text-tertiary text-xs">
          Shared with your client through their portal.
        </p>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-2 bg-fp-accent hover:bg-fp-accent-hover text-fp-base text-xs font-semibold px-3 py-2 rounded-lg transition-colors duration-150 disabled:opacity-50 shrink-0"
        >
          {isUploading
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {uploadStatus || 'Uploading...'}</>
            : <><Upload className="w-3.5 h-3.5" /> Upload</>
          }
        </button>
      </div>

      {/* File list */}
      {files.length === 0 ? (
        <div
          className={`border border-dashed rounded-xl py-10 flex flex-col items-center gap-2 transition-colors duration-150 ${
            isDragging ? 'border-fp-accent/50 bg-fp-accent-muted' : 'border-fp-border'
          }`}
        >
          <File className="w-6 h-6 text-fp-text-tertiary" />
          <p className="text-fp-text-tertiary text-xs">
            {isDragging ? 'Drop to upload' : 'No deliverables yet. Drag files here, or click Upload.'}
          </p>
        </div>
      ) : (
        <div
          className={`border rounded-xl overflow-hidden transition-colors duration-150 ${
            isDragging ? 'border-fp-accent/50' : 'border-fp-border'
          }`}
        >
          {files.map((file, i) => (
            <div
              key={file.id}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-fp-raised transition-colors duration-150 ${
                i !== files.length - 1 ? 'border-b border-fp-border' : ''
              }`}
            >
              <div className="shrink-0 w-8 h-8 rounded-lg bg-fp-accent-muted flex items-center justify-center">
                <FileIcon fileType={file.fileType} fileName={file.name} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-fp-text-primary text-sm font-medium truncate leading-snug">
                  {file.name}
                </p>
                <p className="text-fp-text-tertiary text-[11px] flex items-center gap-1.5 mt-0.5">
                  <span>{formatSize(file.size)}</span>
                  <span className="text-fp-border">·</span>
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(file.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
              </div>

              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open or download ${file.name}`}
                className="shrink-0 text-fp-text-tertiary hover:text-fp-accent transition-colors duration-150 p-1.5 rounded-lg hover:bg-fp-accent-muted"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
          {isDragging && (
            <div className="px-4 py-2.5 text-center text-xs text-fp-accent bg-fp-accent-muted border-t border-fp-border">
              Drop to add more files
            </div>
          )}
        </div>
      )}
    </div>
  )
}