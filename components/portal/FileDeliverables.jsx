// components/portal/FileDeliverables.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Shows project-level files delivered by the freelancer.
// Server Component — no interactivity needed, just download links.
//
// Design changes: white cards, fp-portal-border dividers, amber icon.
// ─────────────────────────────────────────────────────────────────────────────

import { File, Download, Image, FileBracesCorner, FileSpreadsheet, FileText, FolderArchive } from 'lucide-react'

function formatSize(bytes) {
  if (!bytes)              return ''
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileEmoji(fileType) {
  if (!fileType)                                                       return <File className='text-fp-portal-accent'/>
  if (fileType.startsWith('image/'))                                  return <Image className='text-fp-portal-accent' />
  if (fileType === 'application/pdf')                                 return <FileBracesCorner className='text-fp-portal-accent'/>
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileSpreadsheet className='text-fp-portal-accent'/>
  if (fileType.includes('word') || fileType.includes('document'))     return <FileText className='text-fp-portal-accent'/>
  if (fileType.includes('zip') || fileType.includes('compressed'))    return <FolderArchive className='text-fp-portal-accent'/>
  return <File className='text-fp-portal-accent'/>
}

export default function FileDeliverables({ files }) {
  if (!files || files.length === 0) {
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
    <div className="bg-fp-portal-surface border border-fp-portal-border rounded-xl overflow-hidden">
      <div className="divide-y divide-fp-portal-border">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-fp-portal-raised transition-colors duration-150 group"
          >
            {/* File type icon */}
            <span className="text-lg shrink-0 leading-none">{fileEmoji(file.fileType)}</span>

            {/* File info */}
            <div className="flex-1 min-w-0">
              <p className="text-fp-portal-text-primary text-xs font-medium truncate">
                {file.name}
              </p>
              <p className="text-fp-portal-text-tertiary text-[10px] mt-0.5">
                {formatSize(file.size)}
                {file.fileType && ` · ${file.fileType.split('/')[1]?.toUpperCase()}`}
              </p>
            </div>

            {/* Download link */}
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="
                shrink-0 p-1.5 rounded-lg
                text-fp-portal-text-tertiary hover:text-fp-portal-accent
                hover:bg-fp-portal-raised
                transition-colors duration-150
              "
              title="Download"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}