// components/dashboard/milestones/MilestoneRow.jsx
'use client'

import { useState } from 'react'
import {
  GripVertical, CheckCircle2, CircleDashed, ArrowRightCircle,
  Eye, Loader2, Trash2, ChevronDown, ChevronRight, MessageSquare,
  Send, Calendar as CalendarIcon,
} from 'lucide-react'
import MilestoneUpdateFeed from './MilestoneUpdateFeed'
import MilestoneUpdateForm from './MilestoneUpdateForm'
import DeliveryModal       from './DeliveryModal'
import TaskBoard            from './TaskBoard'
import axios from 'axios'
// CHANGED — shadcn's own Calendar/Popover, replacing the native
// <input type="date"> below. Aliased the lucide icon above to
// CalendarIcon so it doesn't collide with this Calendar component —
// both are still used, just for different things (a small glyph vs.
// the actual picker).
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const statusBadgeStyles = {
  PENDING:     'bg-fp-border/50 text-fp-text-tertiary border-fp-border',
  IN_PROGRESS: 'bg-fp-accent-muted text-fp-accent border-fp-accent/20',
  IN_REVIEW:   'bg-fp-warning/10 text-fp-warning border-fp-warning/20',
  COMPLETED:   'bg-fp-success/10 text-fp-success border-fp-success/20',
}

function StatusIcon({ status }) {
  if (status === 'COMPLETED')   return <CheckCircle2     className="w-4 h-4 text-fp-success" />
  if (status === 'IN_PROGRESS') return <ArrowRightCircle className="w-4 h-4 text-fp-accent" />
  if (status === 'IN_REVIEW')   return <Eye              className="w-4 h-4 text-fp-warning" />
  return <CircleDashed className="w-4 h-4 text-fp-text-tertiary" />
}

function SmallStatusIcon({ status }) {
  if (status === 'COMPLETED')   return <CheckCircle2     className="w-3.5 h-3.5" />
  if (status === 'IN_PROGRESS') return <ArrowRightCircle className="w-3.5 h-3.5" />
  if (status === 'IN_REVIEW')   return <Eye              className="w-3.5 h-3.5" />
  return <CircleDashed className="w-3.5 h-3.5" />
}

function toDateInputValue(date) {
  if (!date) return ''
  return new Date(date).toISOString().split('T')[0]
}

function formatDueDateDisplay(date) {
  if (!date) return null
  const d     = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isOverdue = d < today
  const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return { label: `Due ${label}`, isOverdue }
}

// NEW — same fail-closed default as MilestoneManager's DEFAULT_PERMISSIONS.
// If this component is ever rendered without a `permissions` prop, treat
// the viewer as view-only rather than assuming full access.
const DEFAULT_PERMISSIONS = {
  canManageMilestones: false,
  canPostToClientThread: false,
  canDeleteAnyTask: false,
  canUploadFiles: false,
  canManageFiles: false,
}

export default function MilestoneRow({
  milestone,
  onStatusChange,
  onMilestoneUpdate,
  onDelete,
  isUpdating,
  isDeleting,
  freelancerName,
  clientName,
  // NEW — passed down from MilestoneManager. `permissions.canManageMilestones`
  // is the one this file cares about most; the rest (canDeleteAnyTask,
  // canUploadFiles, canManageFiles) get forwarded to TaskBoard below,
  // which isn't part of this upload yet.
  permissions = DEFAULT_PERMISSIONS,
  currentUserId,
  // ── Drag props from MilestoneManager ──────────────────────────────────────
  // isDragging: this row is the one being dragged — render semi-transparent
  // isOver:     a dragged row is hovering over this row — show accent border
  // draggable:  CHANGED — this used to be hardcoded `true` on the DOM
  //             element below, completely ignoring whatever the parent
  //             decided. MilestoneManager now computes this from
  //             canManageMilestones and passes it down — this file just
  //             needs to actually READ it, which it wasn't doing before.
  // onDragStart / onDragOver / onDrop / onDragEnd: forwarded to the DOM element
  draggable,
  isDragging,
  isOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) {
  const canManage = permissions?.canManageMilestones ?? false

  const [isOpen,         setIsOpen]        = useState(false)
  const [localUpdates,   setLocalUpdates]  = useState(milestone.milestoneUpdates ?? [])
  const [isDeliveryOpen, setIsDeliveryOpen]= useState(false)
  const [dueDate,        setDueDate]       = useState(milestone.dueDate ?? null)
  const [isDueSaving,    setIsDueSaving]   = useState(false)
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false)

  const messages       = milestone.messages ?? []
  const totalItems     = localUpdates.length + messages.length
  const fileOptions    = localUpdates.filter(u => !!u.fileUrl)
  const dueDateDisplay = formatDueDateDisplay(dueDate)
  const hasUnresolved  = !!milestone.rejectionNote && milestone.status !== 'COMPLETED'

  const handleNewUpdate      = (newUpdate)       => setLocalUpdates(prev => [...prev, newUpdate])
  const handleDeliverySuccess= (updatedMilestone)=> onMilestoneUpdate(updatedMilestone)

  // CHANGED — bails out immediately if the viewer can't manage
  // milestones. Same "guard the function, not just the button" logic
  // as MilestoneManager: this is defense in depth, not the real lock
  // (that's the server-side can() check on PATCH /api/milestones/[id]).
  const handleDueDateChange = async (e) => {
    if (!canManage) return
    const rawValue = e.target.value
    const newDate  = rawValue ? new Date(rawValue) : null
    setDueDate(newDate)
    setIsDueSaving(true)
    try {
      await axios.patch(`/api/milestones/${milestone.id}`, {
        dueDate: rawValue || null,
      })
    } catch {
      setDueDate(milestone.dueDate ?? null)
      alert('Could not save due date.')
    } finally {
      setIsDueSaving(false)
    }
  }

  return (
    <>
      {/*
        ── Drag container ──────────────────────────────────────────────────────
        draggable={draggable}
          → CHANGED from a hardcoded `true`. Now false whenever the viewer
            can't manage milestones, so a Contributor's browser won't even
            let them pick the row up — matches the fact that onDragStart/
            onDragOver/onDrop (in MilestoneManager, one level up) already
            no-op for them anyway.

        onDragStart → tells the parent "I started being dragged"
        onDragOver  → fires repeatedly while another row is dragged over this one.
                      Must call e.preventDefault() (done in parent) or the
                      browser won't allow a drop here.
        onDrop      → fires when the dragged item is released over this row.
        onDragEnd   → fires when the drag ends anywhere (drop or cancel).

        isDragging:  opacity-40 makes the source row "ghost" while dragging.
        isOver:      accent border shows where the row will land if released.

        transition-opacity + transition-colors give smooth visual feedback.
      */}
      <div
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        className={`
          rounded-xl overflow-hidden
          transition-opacity duration-150
          ${isDragging ? 'opacity-40' : 'opacity-100'}
          ${isOver
            ? 'border-fp-accent shadow-[0_0_0_2px_var(--color-fp-accent,#7B93FF)]/20'
            : 'border-fp-border'
          }
        `}
      >

        {/* ── Collapsed row ── */}
        <div className={`
          flex items-center gap-2.5 px-3 py-2.5 bg-fp-raised group
          ${isOpen ? 'border-b border-fp-border' : ''}
        `}>

          {/*
            Drag handle — the GripVertical icon.
            CHANGED — only shows the "grab" cursor affordance when the
            viewer can actually drag. Otherwise it's just a static icon
            (still visible, so the layout doesn't shift, but it no
            longer invites an action that won't do anything).
          */}
          <div className={`shrink-0 touch-none ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default opacity-40'}`}>
            <GripVertical className="w-4 h-4 text-fp-text-tertiary" />
          </div>

          {/* Status icon — CHANGED: only clickable-to-advance when
              canManage is true. Otherwise it's a plain, non-interactive
              icon — a Contributor can still SEE the current status,
              just can't change it from here. */}
          {canManage ? (
            <button
              onClick={() => onStatusChange(milestone.id, milestone.status)}
              disabled={isUpdating}
              className="hover:scale-110 transition-transform duration-150 focus:outline-none shrink-0 cursor-pointer"
              title="Click to advance status"
            >
              {isUpdating
                ? <Loader2 className="w-4 h-4 text-fp-accent animate-spin" />
                : <StatusIcon status={milestone.status} />
              }
            </button>
          ) : (
            <span className="shrink-0" title="Status (view only)">
              <StatusIcon status={milestone.status} />
            </span>
          )}

          {/* Title row — expands the panel on click. Unchanged —
              expanding to VIEW tasks/conversation/updates is fine for
              every role that reaches this component at all. */}
          <button
            onClick={() => setIsOpen(v => !v)}
            className="flex-1 text-left flex items-center gap-2 min-w-0"
          >
            <span className={`
              text-sm font-medium truncate leading-snug
              ${milestone.status === 'COMPLETED'
                ? 'line-through text-fp-text-tertiary'
                : 'text-fp-text-primary'
              }
            `}>
              {milestone.title}
            </span>

            {dueDateDisplay && milestone.status !== 'COMPLETED' && (
              <span className={`
                shrink-0 flex items-center gap-1
                text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                ${dueDateDisplay.isOverdue
                  ? 'bg-fp-danger/10 text-fp-danger'
                  : 'bg-fp-border/50 text-fp-text-tertiary'
                }
              `}>
                <CalendarIcon className="w-2.5 h-2.5" />
                {dueDateDisplay.label}
              </span>
            )}

            {totalItems > 0 && (
              <span className="
                shrink-0 flex items-center gap-1
                text-[10px] font-bold text-fp-accent bg-fp-accent-muted
                px-1.5 py-0.5 rounded-full
              ">
                <MessageSquare className="w-2.5 h-2.5" />
                {totalItems}
              </span>
            )}

            <span className="ml-auto cursor-pointer shrink-0 flex items-center gap-2">
              {hasUnresolved && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-fp-danger animate-pulse"
                  title="Client feedback waiting"
                />
              )}
              {isOpen
                ? <ChevronDown  className="w-3.5 h-3.5 text-fp-text-tertiary" />
                : <ChevronRight className="w-3.5 h-3.5 text-fp-text-tertiary" />
              }
            </span>
          </button>

          {/* CHANGED — "Send for Review" opens DeliveryModal, which
              edits the delivery card (headline/summary/file/checklist).
              That's full milestone-management territory, not
              view-only, so it's hidden entirely for a Contributor
              rather than shown-then-blocked. */}
          {canManage && milestone.status === 'IN_PROGRESS' && (
            <button
              onClick={() => setIsDeliveryOpen(true)}
              className="
                shrink-0 flex items-center gap-1.5
                bg-fp-accent hover:bg-fp-accent-hover text-fp-base
                text-[10px] font-bold uppercase tracking-wider
                px-2.5 py-1.5 rounded-lg transition-colors duration-150 cursor-pointer
              "
            >
              <Send className="w-3.5 h-3.5" />
              Send for Review
            </button>
          )}

          {/* CHANGED — the status badge for every OTHER status. When
              canManage is true this stays a clickable "advance status"
              button, same as before. When false, it renders the exact
              same badge but as a plain <span> — a Contributor still
              sees "Awaiting Client" / "Pending" etc., just can't click
              it to change it. */}
          {milestone.status !== 'IN_PROGRESS' && (
            canManage ? (
              <button
                disabled={isUpdating || milestone.status === 'COMPLETED'}
                onClick={() => onStatusChange(milestone.id, milestone.status)}
                className={`
                  shrink-0 flex items-center gap-1.5
                  text-[10px] font-bold uppercase tracking-wider
                  px-2.5 py-1.5 rounded-lg bg-transparent transition-all duration-150
                  disabled:cursor-not-allowed
                  ${statusBadgeStyles[milestone.status]}
                  ${milestone.status === 'IN_REVIEW' ? 'animate-pulse' : ''}
                `}
              >
                <SmallStatusIcon status={milestone.status} />
                {milestone.status === 'IN_REVIEW'
                  ? 'Awaiting Client'
                  : milestone.status.replace('_', ' ')
                }
              </button>
            ) : (
              <span
                className={`
                  shrink-0 flex items-center gap-1.5
                  text-[10px] font-bold uppercase tracking-wider
                  px-2.5 py-1.5 rounded-lg
                  ${statusBadgeStyles[milestone.status]}
                `}
              >
                <SmallStatusIcon status={milestone.status} />
                {milestone.status === 'IN_REVIEW'
                  ? 'Awaiting Client'
                  : milestone.status.replace('_', ' ')
                }
              </span>
            )
          )}

          {/* CHANGED — delete button hidden entirely without
              canManage, instead of shown-and-disabled. Matches the
              matrix flatly: milestone delete isn't a Contributor
              action under any circumstance, unlike task delete which
              has a creator/assignee exception. */}
          {canManage && (
            <button
              onClick={() => onDelete(milestone.id)}
              disabled={isDeleting}
              className="
                opacity-0 group-hover:opacity-100 transition-opacity duration-150
                text-fp-text-tertiary hover:text-fp-danger
                p-1 rounded shrink-0 cursor-pointer
              "
              title="Delete milestone"
            >
              {isDeleting
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Trash2  className="w-3.5 h-3.5" />
              }
            </button>
          )}

        </div>

        {/* ── Expanded panel ── */}
        {isOpen && (
          <div className="px-4 py-4 bg-fp-base space-y-4">

            {/* CHANGED — due date is now editable only with canManage.
                A Contributor sees the same information as a plain
                label instead of a date picker that would 403 on
                change. */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-fp-text-tertiary shrink-0">
                <CalendarIcon className="w-3 h-3" />
                Due date
              </label>
              {canManage ? (
                <div className="flex items-center gap-2">
                  {/* CHANGED — was a native <input type="date">, which
                      renders with the OS's own calendar UI (the thing
                      that clashed with the dark theme). handleDueDateChange
                      below is untouched — Calendar's onSelect just calls
                      it with the same { target: { value } } shape the
                      native input's onChange used to produce, via the
                      existing toDateInputValue helper. */}
                  <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        disabled={isDueSaving}
                        className="
                          flex items-center gap-2
                          bg-fp-raised border border-fp-border
                          text-xs text-left rounded-lg px-2.5 py-1.5
                          hover:border-fp-accent/40
                          focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/50
                          disabled:opacity-50 cursor-pointer
                          transition-colors duration-150
                        "
                      >
                        <CalendarIcon className="w-3.5 h-3.5 text-fp-text-tertiary shrink-0" />
                        <span className={dueDate ? 'text-fp-text-secondary' : 'text-fp-text-tertiary'}>
                          {dueDate
                            ? new Date(dueDate).toLocaleDateString('en-GB', {
                                day: 'numeric', month: 'short', year: 'numeric',
                              })
                            : 'Set due date'}
                        </span>
                      </button>
                    </PopoverTrigger>
                    {/* fp-dark-popover (see globals.css) — shadcn's Calendar
                        renders through Popover's own portal, using semantic
                        classes like bg-popover / bg-accent that read from
                        the root --popover/--accent CSS vars. Those vars are
                        only overridden for dark under the existing .dark
                        class, and .dark here only touches sidebar tokens —
                        so without this, the calendar would render with the
                        light-mode shadcn palette (white) inside the dark
                        dashboard. fp-dark-popover scopes fp-equivalent
                        values to just this popover instead of touching
                        .dark globally, since that class is also reached by
                        the light-themed client portal. */}
                    <PopoverContent align="start" className="fp-dark-popover w-auto p-0 border-fp-border">
                      <Calendar
                        mode="single"
                        selected={dueDate ? new Date(dueDate) : undefined}
                        onSelect={(date) => {
                          handleDueDateChange({
                            target: { value: date ? toDateInputValue(date) : '' },
                          })
                          setIsDatePopoverOpen(false)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {isDueSaving && (
                    <Loader2 className="w-3 h-3 text-fp-accent animate-spin" />
                  )}
                  {dueDate && !isDueSaving && (
                    <button
                      type="button"
                      onClick={() => handleDueDateChange({ target: { value: '' } })}
                      className="text-[10px] text-fp-text-tertiary hover:text-fp-danger transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-xs text-fp-text-secondary">
                  {dueDateDisplay ? dueDateDisplay.label.replace(/^Due /, '') : 'Not set'}
                </span>
              )}
            </div>

            <div className="mb-7" />

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-fp-text-tertiary mb-3">
                Tasks
              </p>
              {/* NEW — permissions/currentUserId forwarded. TaskBoard
                  isn't part of this upload yet: per the matrix,
                  createTask/editAnyTask are true for EVERY role
                  including Contributor (so task creation/editing
                  shouldn't be hidden), but deleteAnyTask needs
                  canDeleteTask(role, task, currentUserId) from
                  lib/project-permissions.js — a Contributor can only
                  delete a task they created or are assigned to, not
                  any task. That logic has to live inside TaskBoard,
                  once shared. */}
              <TaskBoard
                milestoneId={milestone.id}
                projectId={milestone.projectId}
                permissions={permissions}
                currentUserId={currentUserId}
              />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-fp-text-tertiary mb-3">
                Conversation
              </p>
              {/* Unchanged — viewClientThread is true for every role,
                  including Contributor, so the feed itself is never
                  gated. */}
              <MilestoneUpdateFeed
                updates={localUpdates}
                messages={messages}
                freelancerName={freelancerName}
                clientName={clientName}
              />
            </div>

            {/* Unchanged — this posts a milestone UPDATE (a freelancer
                note), which maps to 'postOwnUpdate' in the matrix —
                true for every role, Contributor included. This is
                deliberately NOT gated behind canManage; don't merge it
                with the due-date/status/delete guards above. */}
            <div className="pt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-fp-text-tertiary mb-2">
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

      {isDeliveryOpen && (
        <DeliveryModal
          milestone={milestone}
          fileOptions={fileOptions}
          onSuccess={handleDeliverySuccess}
          onClose={() => setIsDeliveryOpen(false)}
        />
      )}
    </>
  )
}