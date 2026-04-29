// components/project/FilesTab.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Project-level file management. Freelancer uploads files, they appear in a
// list with download links. Client can also see these in the portal.
//
// Design: File rows use bg-fp-raised with a hover border transition to
// fp-accent/20. The file type emoji provides at-a-glance recognition.
// The upload button is primary spec (fp-accent) — it's the main action here.
// ─────────────────────────────────────────────────────────────────────────────
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Clock, Loader2, Upload, File, Image, FileBracesCorner, FileSpreadsheet, FileText, FolderArchive } from 'lucide-react'
import axios from 'axios'

function formatSize(bytes) {
  if (bytes < 1024)           return `${bytes} B`
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileEmoji(fileType) {
  if (!fileType)                                                  return <File className='text-fp-accent'/>
  if (fileType.startsWith('image/'))                             return <Image className='text-fp-accent' />
  if (fileType === 'application/pdf')                            return <FileBracesCorner className='text-fp-accent'/>
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileSpreadsheet className='text-fp-accent'/>
  if (fileType.includes('word') || fileType.includes('document')) return <FileText className='text-fp-accent'/>
  if (fileType.includes('zip') || fileType.includes('compressed')) return <FolderArchive className='text-fp-accent'/>
  return <File className='text-fp-accent'/>
}

export default function FilesTab({ project }) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)
  const router = useRouter()

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)

    const formData = new FormData()
    formData.append('file',      file)
    formData.append('projectId', project.id)

    try {
      await axios.post(`/api/projects/${project.id}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      router.refresh()
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      alert('Failed to upload file.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">

      {/* ── Upload section ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-fp-text-primary text-sm font-semibold">Deliverables</p>
          <p className="text-fp-text-tertiary text-xs mt-0.5">
            Upload files to share with your client.
          </p>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="
            flex items-center gap-2
            bg-fp-accent hover:bg-fp-accent-hover text-fp-base
            text-xs font-semibold px-3 py-2 rounded-lg
            transition-colors duration-150 disabled:opacity-50
          "
        >
          {isUploading
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</>
            : <><Upload  className="w-3.5 h-3.5" /> Upload</>
          }
        </button>
      </div>

      {/* ── File list ── */}
      {project.files?.length === 0 ? (
        <div className="
          border border-dashed border-fp-border rounded-xl
          py-10 flex flex-col items-center gap-2
        ">
          <File className="w-6 h-6 text-fp-text-tertiary" />
          <p className="text-fp-text-tertiary text-xs">No files yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {project.files?.map((file) => (
            <div
              key={file.id}
              className="
                bg-fp-raised border border-fp-border rounded-lg p-3
                flex items-center justify-between gap-3
                hover:border-fp-accent/20 transition-colors duration-150 group
              "
            >
              {/* File info */}
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg shrink-0 leading-none">
                  {fileEmoji(file.fileType)}
                </span>
                <div className="min-w-0">
                  <p className="text-fp-text-primary text-xs font-medium truncate">
                    {file.name}
                  </p>
                  <p className="text-fp-text-tertiary text-[10px] flex items-center gap-1.5 mt-0.5">
                    <span>{formatSize(file.size)}</span>
                    <span className="text-fp-border">·</span>
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(file.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short',
                    })}
                  </p>
                </div>
              </div>

              {/* Download link */}
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  shrink-0 text-fp-text-tertiary
                  hover:text-fp-accent transition-colors duration-150
                  p-1.5 rounded-lg hover:bg-fp-accent-muted
                "
                title="Open / download"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}