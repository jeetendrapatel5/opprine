// components/dashboard/team/InviteMemberForm.jsx
//
// Client Component — needs to be, since it holds form state and makes
// a fetch() call. Posts to POST /api/workspace/invites (built earlier)
// and lets that route do all real validation (this component's own
// checks are just for a responsive UI, not the source of truth).
//
// FLAGGED: input/select styling below is hand-rolled with fp- tokens,
// since no existing form input was in the file I was given to match
// against. If shadcn's <Input>/<Select> are already used elsewhere in
// this app, swap them in here instead — see the chat message before
// this code.
//
// FIX: the Role options list is rendered through a portal into
// document.body and positioned with `position: fixed`, computed from
// the trigger's bounding rect. That's what lets it escape any
// ancestor's overflow-hidden/overflow-auto/height clipping and sit
// above everything via z-index — a plain `absolute` child stays
// trapped inside the nearest clipped/scrolling ancestor, which was
// the original bug. Position is recalculated on open, on resize, and
// on scroll (capture phase, so scrolling inside any nested scroll
// container counts too) so the dropdown stays pinned to the Role
// input at all times.

'use client'

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Loader2, ChevronDown, Check } from 'lucide-react'

// Matches INVITABLE_ROLES in app/api/workspace/invites/route.js exactly
// — OWNER is intentionally not offered here, mirroring the backend.
const ROLE_OPTIONS = [
  { value: 'MEMBER', label: 'Member' },
  { value: 'ADMIN', label: 'Admin' },
]

export default function InviteMemberForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('MEMBER')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Custom role dropdown: open/closed state, plus refs so we can tell
  // whether a click landed inside the trigger, inside the portaled
  // dropdown, or truly outside both.
  const [roleOpen, setRoleOpen] = useState(false)
  const roleRef = useRef(null)       // wraps the trigger button — also the position anchor
  const dropdownRef = useRef(null)   // the portaled <ul>, lives in document.body
  const [dropdownRect, setDropdownRect] = useState(null)
  const selectedRole = ROLE_OPTIONS.find((opt) => opt.value === role)

  const updateDropdownPosition = useCallback(() => {
    if (!roleRef.current) return
    const rect = roleRef.current.getBoundingClientRect()
    setDropdownRect({
      top: rect.bottom + 6, // 6px ≈ the original `mt-1.5` gap
      left: rect.left,
      width: rect.width,
    })
  }, [])

  // Position the portal before paint so it never flashes in the
  // wrong spot the moment it opens.
  useLayoutEffect(() => {
    if (!roleOpen) return
    updateDropdownPosition()
  }, [roleOpen, updateDropdownPosition])

  useEffect(() => {
    if (!roleOpen) return

    function handleClickOutside(event) {
      const clickedTrigger = roleRef.current && roleRef.current.contains(event.target)
      const clickedDropdown = dropdownRef.current && dropdownRef.current.contains(event.target)
      if (!clickedTrigger && !clickedDropdown) {
        setRoleOpen(false)
      }
    }
    function handleEscape(event) {
      if (event.key === 'Escape') setRoleOpen(false)
    }
    function handleReposition() {
      updateDropdownPosition()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', handleReposition)
    // capture: true so this also fires when a scrollable ancestor
    // (not just the window) scrolls
    window.addEventListener('scroll', handleReposition, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [roleOpen, updateDropdownPosition])

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setSuccess(false)
    setSubmitting(true)

    try {
      const res = await fetch('/api/workspace/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })

      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(body.error ?? 'Could not send this invite.')
      }

      setEmail('')
      setRole('MEMBER')
      setSuccess(true)
      // Re-runs the Server Component that fetched the pending-invites
      // list, so the new invite shows up below without a full reload.
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send this invite.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label
          htmlFor="invite-email"
          className="block text-[10px] font-bold text-fp-text-tertiary uppercase tracking-widest mb-1.5"
        >
          Email
        </label>
        <input
          id="invite-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@company.com"
          className="
            w-full h-9 px-3 rounded-lg text-sm
            bg-fp-base border border-fp-border
            text-fp-text-primary placeholder:text-fp-text-tertiary
            focus:outline-none focus:border-fp-accent/50 focus:ring-1 focus:ring-fp-accent/30
            transition-colors duration-150
          "
        />
      </div>

      <div>
        <label
          htmlFor="invite-role"
          className="block text-[10px] font-bold text-fp-text-tertiary uppercase tracking-widest mb-1.5"
        >
          Role
        </label>
        <div className="relative" ref={roleRef}>
          <button
            id="invite-role"
            type="button"
            onClick={() => setRoleOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={roleOpen}
            className="
              w-full h-9 pl-3 pr-9 rounded-lg text-sm text-left
              bg-fp-base border border-fp-border
              text-fp-text-primary
              hover:border-fp-text-tertiary/50
              focus:outline-none focus:border-fp-accent/50 focus:ring-1 focus:ring-fp-accent/30
              transition-colors duration-150
            "
          >
            {selectedRole.label}
          </button>

          <ChevronDown
            className={`
              pointer-events-none absolute right-3 top-1/2 -translate-y-1/2
              w-4 h-4 text-fp-text-tertiary
              transition-transform duration-150
              ${roleOpen ? 'rotate-180' : ''}
            `}
          />

          {roleOpen && dropdownRect && typeof document !== 'undefined' && createPortal(
            <ul
              ref={dropdownRef}
              role="listbox"
              tabIndex={-1}
              aria-labelledby="invite-role"
              style={{
                position: 'fixed',
                top: dropdownRect.top,
                left: dropdownRect.left,
                width: dropdownRect.width,
                zIndex: 9999,
              }}
              className="
                py-1
                rounded-lg border border-fp-border
                bg-fp-raised shadow-xl
                overflow-hidden
              "
            >
              {ROLE_OPTIONS.map((opt) => {
                const isSelected = opt.value === role
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setRole(opt.value)
                      setRoleOpen(false)
                    }}
                    className={`
                      flex items-center justify-between
                      px-3 py-2 text-sm cursor-pointer
                      transition-colors duration-100
                      ${isSelected
                        ? 'text-fp-accent'
                        : 'text-fp-text-primary hover:bg-fp-surface'}
                    `}
                  >
                    {opt.label}
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </li>
                )
              })}
            </ul>,
            document.body
          )}
        </div>
      </div>

      {error && <p className="text-xs text-fp-danger">{error}</p>}
      {success && <p className="text-xs text-fp-success">Invite sent.</p>}

      {/* Exact primary-button classes from the "Open portal" link in
          page.jsx: bg-fp-accent text-black text-xs font-semibold,
          hover:opacity-90 — not a new style invented for this form. */}
      <button
        type="submit"
        disabled={submitting}
        className="
          w-full inline-flex items-center justify-center gap-1.5
          h-8 px-3 rounded-lg
          bg-fp-accent text-black text-xs font-semibold
          hover:opacity-90 transition-opacity
          disabled:opacity-60 disabled:pointer-events-none
        "
      >
        {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {submitting ? 'Sending…' : 'Send invite'}
      </button>
    </form>
  )
}