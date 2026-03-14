// components/dashboard/milestones/MilestoneRow.jsx
'use client'

import { useState } from 'react'
import {
  GripVertical, CheckCircle2, CircleDashed, ArrowRightCircle,
  Eye, Loader2, Trash2, ChevronDown, ChevronRight, MessageSquare
} from 'lucide-react'
import MilestoneUpdateFeed from './MilestoneUpdateFeed'
import MilestoneUpdateForm from './MilestoneUpdateForm'

const statusStyles = {
  PENDING:     'bg-gray-100    text-gray-500    border-gray-200',
  IN_PROGRESS: 'bg-blue-50    text-blue-700    border-blue-200',
  IN_REVIEW:   'bg-amber-50   text-amber-700   border-amber-200 animate-pulse',
  COMPLETED:   'bg-emerald-50 text-emerald-700  border-emerald-200',
}

function StatusIcon({ status }) {
  if (status === 'COMPLETED')   return <CheckCircle2     className="w-5 h-5 text-emerald-600" />
  if (status === 'IN_PROGRESS') return <ArrowRightCircle className="w-5 h-5 text-orange-500" />
  if (status === 'IN_REVIEW')   return <Eye              className="w-5 h-5 text-amber-500" />
  return <CircleDashed className="w-5 h-5 text-gray-300" />
}

function SmallStatusIcon({ status }) {
  if (status === 'COMPLETED')   return <CheckCircle2     className="w-3 h-3" />
  if (status === 'IN_PROGRESS') return <ArrowRightCircle className="w-3 h-3" />
  if (status === 'IN_REVIEW')   return <Eye              className="w-3 h-3" />
  return <CircleDashed className="w-3 h-3" />
}

export default function MilestoneRow({ milestone, onStatusChange, onDelete, isUpdating, isDeleting }) {
  const [isOpen, setIsOpen]             = useState(false)
  const [localUpdates, setLocalUpdates] = useState(milestone.milestoneUpdates ?? [])

  // messages come from the DB (permanent history) — they never change locally
  // because they are only created by the client via the approve route.
  // After a router.refresh() the server re-fetches them with new ones included.
  const messages = milestone.messages ?? []

  const handleNewUpdate = (newUpdate) => {
    setLocalUpdates((prev) => [...prev, newUpdate])
  }

  // Total conversation items — used for the count badge on the row
  const totalItems = localUpdates.length + messages.length

  // Red dot condition: unresolved client feedback exists
  // Uses rejectionNote (single field) as a quick indicator — it is set on
  // every rejection and cleared to null on approval. Cheap to check.
  const hasUnresolvedFeedback =
    !!milestone.rejectionNote && milestone.status !== 'COMPLETED'

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">

      {/* ── Main row ──────────────────────────────────────────────────────── */}
      <div className={`flex items-center gap-3 p-3 bg-gray-50 group ${isOpen ? 'border-b border-gray-100' : ''}`}>

        <GripVertical className="w-4 h-4 text-gray-300 cursor-grab shrink-0" />

        {/* Status icon — clicking cycles to next status */}
        <button
          onClick={() => onStatusChange(milestone.id, milestone.status)}
          disabled={isUpdating}
          className="hover:scale-110 transition-transform focus:outline-none shrink-0"
          title="Click to advance status"
        >
          {isUpdating
            ? <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
            : <StatusIcon status={milestone.status} />
          }
        </button>

        {/* Title row — clicking expands/collapses the panel */}
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="flex-1 text-left flex items-center gap-2 min-w-0"
        >
          <span className={`text-sm font-medium truncate ${
            milestone.status === 'COMPLETED' ? 'line-through text-gray-400' : 'text-gray-900'
          }`}>
            {milestone.title}
          </span>

          {/* Count badge — total messages + updates */}
          {totalItems > 0 && (
            <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full">
              <MessageSquare className="w-2.5 h-2.5" />
              {totalItems}
            </span>
          )}

          <span className="ml-auto shrink-0 flex items-center gap-1.5">
            {/* Red dot — unresolved client feedback */}
            {hasUnresolvedFeedback && (
              <span
                className="w-2 h-2 rounded-full bg-red-500 animate-pulse"
                title="Client feedback waiting"
              />
            )}
            {isOpen
              ? <ChevronDown  className="w-3.5 h-3.5 text-gray-400" />
              : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            }
          </span>
        </button>

        {/* Status badge — also clickable */}
        <button
          disabled={isUpdating || milestone.status === 'COMPLETED'}
          onClick={() => onStatusChange(milestone.id, milestone.status)}
          className={`shrink-0 flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg border transition-all disabled:cursor-not-allowed ${statusStyles[milestone.status]}`}
        >
          <SmallStatusIcon status={milestone.status} />
          {milestone.status === 'IN_REVIEW' ? 'Awaiting Client' : milestone.status.replace('_', ' ')}
        </button>

        {/* Delete — visible on hover */}
        <button
          onClick={() => onDelete(milestone.id)}
          disabled={isDeleting}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 p-1 rounded shrink-0"
          title="Delete milestone"
        >
          {isDeleting
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Trash2  className="w-4 h-4" />
          }
        </button>
      </div>

      {/* ── Expandable panel ──────────────────────────────────────────────── */}
      {isOpen && (
        <div className="px-4 py-4 bg-white">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
            Conversation
          </p>

          {/*
            The unified feed receives BOTH data sources.
            It merges them internally, sorts by createdAt, and renders
            each entry differently based on its type.

            localUpdates  → freelancer work logs (grows as freelancer posts)
            messages      → client rejection history (all past messages, never deleted)

            The feed handles ordering so both sides are always in correct time sequence.
          */}
          <MilestoneUpdateFeed
            updates={localUpdates}
            messages={messages}
          />

          {/* Post new update */}
          <div className="border-t border-gray-100 mt-4 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              Add Update
            </p>
            <MilestoneUpdateForm
              milestoneId={milestone.id}
              onSuccess={handleNewUpdate}
            />
          </div>
        </div>
      )}
    </div>
  )
}