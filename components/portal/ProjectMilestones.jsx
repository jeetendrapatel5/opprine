// components/portal/ProjectMilestones.jsx
import { CheckCircle2, CircleDashed, ArrowRightCircle, Eye } from 'lucide-react'

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileEmoji(fileType) {
  if (!fileType) return '📁'
  if (fileType.startsWith('image/')) return '🖼️'
  if (fileType === 'application/pdf') return '📄'
  return '📁'
}

// Builds the unified conversation for a single milestone.
// Merges freelancer updates + client messages, sorted oldest-first.
function buildConversation(milestoneUpdates = [], messages = []) {
  const updates  = milestoneUpdates.map(u => ({ ...u, _type: 'update'  }))
  const msgs     = messages.map(m =>         ({ ...m, _type: 'message' }))
  return [...updates, ...msgs].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  )
}

export default function ProjectMilestones({ milestones, freelancerName, clientName }) {
  if (!milestones || milestones.length === 0) return null

  const completedCount     = milestones.filter(m => m.status === 'COMPLETED').length
  const progressPercentage = Math.round((completedCount / milestones.length) * 100)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-gray-900">Project Timeline</h2>
        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
          {progressPercentage}% Complete
        </span>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2 mb-8">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <div className="space-y-8">
        {milestones.map((milestone, index) => {
          const isCompleted  = milestone.status === 'COMPLETED'
          const isInProgress = milestone.status === 'IN_PROGRESS'
          const isInReview   = milestone.status === 'IN_REVIEW'
          const isPending    = milestone.status === 'PENDING'
          const isLast       = index === milestones.length - 1

          const conversation = buildConversation(
            milestone.milestoneUpdates,
            milestone.messages
          )

          return (
            <div key={milestone.id} className="relative">

              {/* Connecting line */}
              {!isLast && (
                <div
                  className={`absolute left-3 top-8 w-px ${
                    isCompleted ? 'bg-blue-200' : 'bg-gray-100'
                  }`}
                  style={{ bottom: '-2rem' }}
                />
              )}

              <div className="flex items-start gap-4">
                {/* Status icon */}
                <div className="relative z-10 bg-white pt-1 shrink-0">
                  {isCompleted  && <CheckCircle2     className="w-6 h-6 text-blue-600" />}
                  {isInProgress && <ArrowRightCircle className="w-6 h-6 text-orange-500" />}
                  {isInReview   && <Eye              className="w-6 h-6 text-amber-500" />}
                  {isPending    && <CircleDashed     className="w-6 h-6 text-gray-300" />}
                </div>

                <div className="flex-1">
                  {/* Milestone title */}
                  <p className={`text-sm font-medium ${
                    isCompleted  ? 'text-gray-900 line-through opacity-60' :
                    isInProgress ? 'text-gray-900' :
                    isInReview   ? 'text-gray-900' :
                    'text-gray-400'
                  }`}>
                    {milestone.title}
                  </p>

                  {isInProgress && conversation.length === 0 && (
                    <p className="text-xs text-orange-500 mt-1 font-medium">
                      Currently being worked on
                    </p>
                  )}
                  {isInReview && (
                    <p className="text-xs text-amber-600 mt-1 font-medium">
                      ↑ Awaiting your approval (see banner above)
                    </p>
                  )}
                  {isCompleted && (
                    <p className="text-xs text-blue-500 mt-1 font-medium">
                      ✓ Approved
                    </p>
                  )}

                  {/* Unified conversation thread — same data, same order as freelancer sees */}
                  {conversation.length > 0 && (
                    <div className="mt-3 space-y-3 pl-1">
                      {conversation.map((item) => {
                        if (item._type === 'update') {
                          // Freelancer work log entry
                          return (
                            <div key={`u-${item.id}`} className="flex gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 mt-1.5 shrink-0" />
                              <div className="flex-1">
                                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-0.5">
                                  {freelancerName}
                                </p>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                  {item.note}
                                </p>
                                {item.fileUrl && (
                                  <div className="mt-1.5">
                                    {item.fileType?.startsWith('image/') ? (
                                      <a href={item.fileUrl} target="_blank" rel="noopener noreferrer">
                                        <img
                                          src={item.fileUrl}
                                          alt={item.fileName}
                                          className="max-h-40 rounded-lg border border-gray-200 object-cover hover:opacity-90 transition-opacity cursor-zoom-in"
                                        />
                                      </a>
                                    ) : (
                                      
                                       <a href={item.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-indigo-300 transition-colors"
                                      >
                                        <span>{fileEmoji(item.fileType)}</span>
                                        <span className="truncate max-w-[180px]">{item.fileName}</span>
                                        <span className="text-gray-400">{formatSize(item.fileSize)}</span>
                                      </a>
                                    )}
                                  </div>
                                )}
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  {timeAgo(item.createdAt)}
                                </p>
                              </div>
                            </div>
                          )
                        }

                        // Client feedback entry — labelled "Your feedback" so client
                        // knows they wrote this, not the freelancer
                        return (
                          <div key={`m-${item.id}`} className="flex gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                            <div className="flex-1">
                              <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide mb-0.5">
                                💬 {clientName} your feedback
                              </p>
                              <p className="text-sm text-red-800 bg-red-50 border border-red-100 rounded-lg px-3 py-2 leading-relaxed">
                                {item.content}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {timeAgo(item.createdAt)}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}