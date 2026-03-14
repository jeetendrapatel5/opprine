// components/dashboard/milestones/MilestoneUpdateFeed.jsx

// Formats bytes into a human-readable string like "1.2 MB"
function formatSize(bytes) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Maps MIME type to a simple emoji icon
function fileEmoji(fileType) {
    if (!fileType) return '📁'
    if (fileType.startsWith('image/')) return '🖼️'
    if (fileType === 'application/pdf') return '📄'
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊'
    if (fileType.includes('word') || fileType.includes('document')) return '📝'
    if (fileType.includes('zip') || fileType.includes('compressed')) return '🗜️'
    return '📁'
}

function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
}

function FreelancerEntry({ item, isLast }) {
    return (
        <div className="flex gap-3">
            <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                {!isLast && <div className="w-px flex-1 bg-gray-100 mt-1" />}
            </div>
            <div className="flex-1 pb-3">
                {/* Sender label */}
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-1">
                    You
                </p>
                <p className="text-sm text-gray-800 leading-relaxed">{item.note}</p>

                {/* Attached file */}
                {item.fileUrl && (
                    <div className="mt-2">
                        {item.fileType?.startsWith('image/') ? (
                            <a href={item.fileUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                    src={item.fileUrl}
                                    alt={item.fileName}
                                    className="max-h-48 rounded-lg border border-gray-200 object-cover hover:opacity-90 transition-opacity cursor-zoom-in"
                                />
                            </a>
                        ) : (

                            <a href={item.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                            >
                                <span>{fileEmoji(item.fileType)}</span>
                                <span className="truncate max-w-[200px]">{item.fileName}</span>
                                <span className="text-gray-400">· {formatSize(item.fileSize)}</span>
                            </a>
                        )}
                    </div>
                )}
                <p className="text-[10px] text-gray-400 mt-1">{timeAgo(item.createdAt)}</p>
            </div>
        </div>
    )
}

function ClientEntry({ item, isLast }) {
    return (
        <div className="flex gap-3">
            <div className="flex flex-col items-center">
                {/* Red dot marks client messages clearly */}
                <div className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0" />
                {!isLast && <div className="w-px flex-1 bg-red-100 mt-1" />}
            </div>
            <div className="flex-1 pb-3">
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide mb-1">
                    💬 Client feedback
                </p>
                <p className="text-sm text-red-800 bg-red-50 border border-red-100 rounded-lg px-3 py-2 leading-relaxed">
                    {item.content}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">{timeAgo(item.createdAt)}</p>
            </div>
        </div>
    )
}

export default function MilestoneUpdateFeed({ updates, messages }) {
    const taggedUpdates = updates.map(u => ({ ...u, _type: 'update' }))
    const taggedMessages = messages.map(m => ({ ...m, _type: 'message' }))

    // Step 2: Merge both arrays into one
    const combined = [...taggedUpdates, ...taggedMessages]

    // Step 3: Sort by createdAt ascending — oldest first, newest at bottom
    // This gives a natural chat-like reading order
    combined.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

    if (combined.length === 0) {
        return (
            <p className="text-xs text-gray-400 italic py-2">
                No updates yet. Post one below to start the work log.
            </p>
        )
    }

    return (
        <div className="space-y-0">
            {combined.map((item, index) => {
                const isLast = index === combined.length - 1
                if (item._type === 'update') {
                    return <FreelancerEntry key={`u-${item.id}`} item={item} isLast={isLast} />
                }
                return <ClientEntry key={`m-${item.id}`} item={item} isLast={isLast} />
            })}
        </div>
    )
}