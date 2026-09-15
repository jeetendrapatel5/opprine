// components/dashboard/milestones/AssigneeSelect.jsx
//
// Polished replacement for the native <select> TaskBoard used for
// "Assign to". Pulled into its own file following the same pattern as
// MilestoneUpdateFeed/MilestoneUpdateForm living next to MilestoneRow —
// one focused concern per file.
//
// Self-contained by design: coding conventions confirm shadcn/ui
// Avatar + Dialog are already in this project, but Popover/Command
// aren't confirmed, so rather than guess at an import path that might
// not exist, this builds its own small popover (outside-click +
// Escape to close) out of fp-* tokens and plain React state.
//
// currentUserId is compared against each member's userId to render
// the "· Me" indicator — it's already being forwarded down through
// MilestoneRow -> TaskBoard from whatever holds the session higher up
// the tree, so this component just consumes the prop rather than
// re-deriving the current user itself.
//
// Usage:
//   <AssigneeSelect
//     members={projectMembers ?? []}
//     value={newAssigneeId}
//     onChange={setNewAssigneeId}
//     currentUserId={currentUserId}
//     disabled={isSubmitting}
//   />

'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Check, Search, User } from 'lucide-react'

function getInitials(name, email) {
  const source = (name || '').trim() || (email || '').trim()
  if (!source) return '?'
  const parts = source.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function AssigneeSelect({
  members = [],
  value,
  onChange,
  currentUserId,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef(null)
  const searchRef = useRef(null)

  // Close on outside click or Escape — same lifecycle a native <select>
  // gives you for free, so the popover has to earn its keep here.
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    searchRef.current?.focus()
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) setQuery('')
  }, [isOpen])

  const selectedMember = members.find((m) => m.userId === value)

  // Current user pinned to the top, everyone else alphabetical — the
  // scanning aid that matters most ("where am I") comes before the
  // more general one (search, below).
  const sortedMembers = useMemo(() => {
    const list = [...members]
    list.sort((a, b) => {
      const aIsMe = a.userId === currentUserId
      const bIsMe = b.userId === currentUserId
      if (aIsMe && !bIsMe) return -1
      if (bIsMe && !aIsMe) return 1
      return (a.name || a.email || '').localeCompare(b.name || b.email || '')
    })
    return list
  }, [members, currentUserId])

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sortedMembers
    return sortedMembers.filter(
      (m) =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q)
    )
  }, [sortedMembers, query])

  // Only worth the extra chrome once there's actually a list to search.
  const showSearch = members.length > 6

  const handleSelect = (userId) => {
    onChange(userId)
    setIsOpen(false)
  }

  return (
    <div className="relative min-w-[180px]" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((v) => !v)}
        className="
          flex items-center gap-2 w-full
          bg-fp-base border border-fp-border cursor-pointer text-left
          text-xs rounded-lg px-2 py-1.5
          hover:border-fp-accent/40
          focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/50
          disabled:opacity-50 transition-colors duration-150
        "
      >
        {selectedMember ? (
          <>
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-fp-accent-muted text-fp-accent text-[9px] font-bold shrink-0">
              {getInitials(selectedMember.name, selectedMember.email)}
            </span>
            <span className="flex-1 truncate text-fp-text-primary">
              {selectedMember.name || selectedMember.email}
              {selectedMember.userId === currentUserId && (
                <span className="text-fp-accent"> · Me</span>
              )}
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-fp-border/60 text-fp-text-tertiary shrink-0">
              <User className="w-3 h-3" />
            </span>
            <span className="flex-1 truncate text-fp-text-tertiary">Unassigned</span>
          </>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-fp-text-tertiary shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="
            absolute z-20 mt-1.5 w-full min-w-[240px]
            bg-fp-raised border border-fp-border rounded-lg
            shadow-lg shadow-black/10 overflow-hidden
          "
        >
          {showSearch && (
            <div className="p-2 border-b border-fp-border">
              <div className="flex items-center gap-1.5 bg-fp-base border border-fp-border rounded-md px-2 py-1.5">
                <Search className="w-3 h-3 text-fp-text-tertiary shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search members…"
                  className="
                    flex-1 min-w-0 bg-transparent text-fp-text-primary text-xs
                    placeholder:text-fp-text-tertiary focus:outline-none
                  "
                />
              </div>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`
                w-full flex items-center gap-2 px-2.5 py-2 text-left
                hover:bg-fp-surface transition-colors duration-100
                ${!value ? 'bg-fp-surface' : ''}
              `}
            >
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-fp-border/60 text-fp-text-tertiary shrink-0">
                <User className="w-3 h-3" />
              </span>
              <span className="flex-1 text-xs text-fp-text-secondary">Unassigned</span>
              {!value && <Check className="w-3.5 h-3.5 text-fp-accent shrink-0" />}
            </button>

            {filteredMembers.length === 0 ? (
              <p className="px-2.5 py-3 text-[11px] text-fp-text-tertiary text-center">
                No members match "{query}"
              </p>
            ) : (
              filteredMembers.map((m) => {
                const isMe = m.userId === currentUserId
                const isSelected = m.userId === value
                return (
                  <button
                    key={m.userId}
                    type="button"
                    onClick={() => handleSelect(m.userId)}
                    className={`
                      w-full flex items-center gap-2 px-2.5 py-2 text-left
                      hover:bg-fp-surface transition-colors cursor-pointer duration-100
                      ${isSelected ? 'bg-fp-surface' : ''}
                      ${isMe ? 'bg-fp-accent-muted/40' : ''}
                    `}
                  >
                    <span
                      className={`
                        flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold shrink-0
                        ${isMe ? 'bg-fp-accent-muted text-fp-accent' : 'bg-fp-border/60 text-fp-text-secondary'}
                      `}
                    >
                      {getInitials(m.name, m.email)}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1 text-xs font-medium text-fp-text-primary">
                        <span className="truncate">{m.name || m.email}</span>
                        {isMe && <span className="text-fp-accent font-bold shrink-0">· Me</span>}
                      </span>
                      {m.name && m.email && (
                        <span className="block text-[10px] text-fp-text-tertiary truncate">
                          {m.email}
                        </span>
                      )}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-fp-accent shrink-0" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}