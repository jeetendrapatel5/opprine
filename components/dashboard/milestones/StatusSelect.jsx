// components/dashboard/milestones/StatusSelect.jsx
//
// Replaces the native <select> used for a task's status. The native
// element renders with the OS's own white/blue popup styling, which
// is the one un-themed thing left on the task board (see screenshot:
// stark white dropdown, harsh blue highlight, no relation to the fp-*
// dark palette at all).
//
// Kept deliberately light — this is a static 4-item list, not a
// searchable one, so unlike AssigneeSelect there's no search box or
// avatars. The only addition over plain text is a small colored dot,
// reusing the same semantic colors MilestoneRow's statusBadgeStyles
// already uses elsewhere (accent = in progress, warning = in review,
// success = done) — extended to TaskBoard's own
// TODO/IN_PROGRESS/IN_REVIEW/DONE set.
//
// Rendered through a portal rather than inline: the column wrapper
// this sits inside (`rounded-xl overflow-hidden`, in TaskBoard.jsx)
// clips anything that overflows its box, which an ordinary
// absolutely-positioned dropdown would do for any task near the
// bottom of a column. The portal positions itself against the
// trigger's bounding rect instead, so it always renders on top,
// unclipped.
//
// Usage: <StatusSelect statuses={STATUSES} value={task.status}
//           onChange={(next) => updateTask(task.id, { status: next })}
//           disabled={pendingTaskId === task.id} />

'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

const STATUS_DOT = {
  TODO:        'bg-fp-text-tertiary',
  IN_PROGRESS: 'bg-fp-accent',
  IN_REVIEW:   'bg-fp-warning',
  DONE:        'bg-fp-success',
}

export default function StatusSelect({ statuses, value, onChange, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setCoords({ top: rect.bottom + 4, left: rect.left })
    setIsOpen(true)
  }

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        panelRef.current?.contains(e.target)
      ) {
        return
      }
      setIsOpen(false)
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    // Closing on scroll/resize is simpler and lighter-weight than
    // continuously re-measuring the trigger's position while open.
    const handleClose = () => setIsOpen(false)

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    window.addEventListener('scroll', handleClose, true)
    window.addEventListener('resize', handleClose)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('scroll', handleClose, true)
      window.removeEventListener('resize', handleClose)
    }
  }, [isOpen])

  const current = statuses.find((s) => s.value === value)

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
        className="
          flex items-center gap-1
          text-[10px] bg-fp-raised border border-fp-border text-fp-text-secondary
          rounded px-1.5 py-1
          hover:border-fp-accent/40
          focus:outline-none focus:ring-1 focus:ring-fp-accent/30
          disabled:opacity-50 transition-colors duration-150
        "
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[value]}`} />
        {current?.label ?? value}
        <ChevronDown
          className={`w-2.5 h-2.5 text-fp-text-tertiary shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && coords && createPortal(
        <div
          ref={panelRef}
          style={{ top: coords.top, left: coords.left }}
          className="
            fixed z-50 min-w-[130px]
            bg-fp-raised border border-fp-border rounded-lg
            shadow-lg shadow-black/20 overflow-hidden py-1
          "
        >
          {statuses.map((s) => {
            const isSelected = s.value === value
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => { onChange(s.value); setIsOpen(false) }}
                className={`
                  w-full flex items-center gap-2 px-2.5 py-1.5 text-left
                  text-[11px] text-fp-text-secondary hover:bg-fp-surface hover:text-fp-text-primary
                  transition-colors duration-100
                  ${isSelected ? 'bg-fp-surface text-fp-text-primary' : ''}
                `}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[s.value]}`} />
                <span className="flex-1">{s.label}</span>
                {isSelected && <Check className="w-3 h-3 text-fp-accent shrink-0" />}
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </>
  )
}