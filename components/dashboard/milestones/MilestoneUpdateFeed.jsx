import { File, Image, FileBracesCorner, FileSpreadsheet, FileText, FolderArchive } from 'lucide-react'

function formatSize(bytes) {
  if (!bytes)              return ''
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileEmoji(fileType) {
  if (!fileType)                                                       return <File className='text-fp-accent h-3.5 w-3.5'/>
  if (fileType.startsWith('image/'))                                  return <Image className='text-fp-accent h-3.5 w-3.5'/>
  if (fileType === 'application/pdf')                                 return <FileBracesCorner className='text-fp-accent h-3.5 w-3.5'/>
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileSpreadsheet className='text-fp-accent h-3.5 w-3.5'/>
  if (fileType.includes('word') || fileType.includes('document'))     return <FileText className='text-fp-accent h-3.5 w-3.5'/>
  if (fileType.includes('zip') || fileType.includes('compressed'))    return <FolderArchive className='text-fp-accent h-3.5 w-3.5'/>
  return <File className='text-fp-accent h-3.5 w-3.5'/>
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60)     return 'just now'
  if (seconds < 3600)   return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400)  return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// Freelancer update entry — accent colored
function FreelancerEntry({ item, isLast, freelancerName }) {
  return (
    <div className="flex gap-3">

      {/* Timeline column: dot + connector line */}
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 rounded-full bg-fp-accent mt-1.5 shrink-0" />
        {/* Connector line — extends down to the next item */}
        {!isLast && <div className="w-px flex-1 bg-fp-border mt-1" />}
      </div>

      <div className="flex-1 pb-4">
        {/* Sender label — small, uppercase, accent color */}
        <p className="text-[10px] font-bold text-fp-accent uppercase tracking-wide mb-1">
          {freelancerName}
        </p>

        {/* Note text */}
        <p className="text-sm text-fp-text-secondary leading-relaxed">
          {item.note}
        </p>

        {/* Attached file — image preview or file chip */}
        {item.fileUrl && (
          <div className="mt-2">
            {item.fileType?.startsWith('image/') ? (
              <a href={item.fileUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={item.fileUrl}
                  alt={item.fileName}
                  className="
                    max-h-48 rounded-lg border border-fp-border object-cover
                    hover:opacity-80 transition-opacity duration-150 cursor-zoom-in
                  "
                />
              </a>
            ) : (
              <a
                href={item.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  inline-flex items-center gap-1.5
                  bg-fp-raised border border-fp-border rounded-lg px-3 py-1.5
                  text-xs font-medium text-fp-text-secondary
                  hover:border-fp-accent/30 hover:text-fp-accent
                  transition-colors duration-150
                "
              >
                <span>{fileEmoji(item.fileType)}</span>
                <span className="truncate max-w-[200px]">{item.fileName}</span>
                {item.fileSize && (
                  <span className="text-fp-text-tertiary">· {formatSize(item.fileSize)}</span>
                )}
              </a>
            )}
          </div>
        )}

        <p className="text-[10px] text-fp-text-tertiary mt-1.5">
          {timeAgo(item.createdAt)}
        </p>
      </div>

    </div>
  )
}

// Client message entry — warning colored (amber = attention needed)
function ClientEntry({ item, isLast, clientName }) {
  return (
    <div className="flex gap-3">

      <div className="flex flex-col items-center">
        {/* Amber dot — distinct from freelancer's accent dot */}
        <div className="w-2 h-2 rounded-full bg-fp-warning mt-1.5 shrink-0" />
        {!isLast && <div className="w-px flex-1 bg-fp-border mt-1" />}
      </div>

      <div className="flex-1 pb-4">
        <p className="text-[10px] font-bold text-fp-warning uppercase tracking-wide mb-1">
          💬 {clientName}
        </p>

        {/* Client message — sits in a warning-tinted box to stand out */}
        <p className="
          text-sm text-fp-text-primary leading-relaxed
          bg-fp-warning/5 border border-fp-warning/15 rounded-lg px-3 py-2
        ">
          {item.content}
        </p>

        <p className="text-[10px] text-fp-text-tertiary mt-1.5">
          {timeAgo(item.createdAt)}
        </p>
      </div>

    </div>
  )
}

export default function MilestoneUpdateFeed({
  updates   = [],
  messages  = [],
  freelancerName = 'Freelancer',
  clientName     = 'Client',
}) {
  // Tag each item with its type so we know which component to render
  const tagged = [
    ...updates.map(u  => ({ ...u,  _type: 'update'  })),
    ...messages.map(m => ({ ...m,  _type: 'message' })),
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  // Sort ascending — oldest first, newest at bottom (chat convention)

  if (tagged.length === 0) {
    return (
      <p className="text-xs text-fp-text-tertiary italic py-2">
        No updates yet. Post one below to start the work log.
      </p>
    )
  }

  return (
    <div>
      {tagged.map((item, index) => {
        const isLast = index === tagged.length - 1
        if (item._type === 'update') {
          return (
            <FreelancerEntry
              key={`u-${item.id}`}
              item={item}
              isLast={isLast}
              freelancerName={freelancerName}
            />
          )
        }
        return (
          <ClientEntry
            key={`m-${item.id}`}
            item={item}
            isLast={isLast}
            clientName={clientName}
          />
        )
      })}
    </div>
  )
}