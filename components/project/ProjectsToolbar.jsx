'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, X, ChevronDown, Loader2 } from 'lucide-react'

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ON_HOLD', label: 'On Hold' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name (A–Z)' },
]

export default function ProjectsToolbar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentQ = searchParams.get('q') ?? ''
  const currentStatus = searchParams.get('status') ?? ''
  const currentSort = searchParams.get('sort') ?? 'newest'

  const [query, setQuery] = useState(currentQ)
  const debounceRef = useRef(null)

  // Stay in sync if the URL changes from elsewhere (back/forward, pagination links).
  useEffect(() => {
    setQuery(currentQ)
  }, [currentQ])

  useEffect(() => {
    return () => clearTimeout(debounceRef.current)
  }, [])

  function navigate(updates) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    // Any filter change invalidates the current page offset.
    if (!('page' in updates)) params.delete('page')

    const qs = params.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }

  function handleSearchChange(value) {
    setQuery(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => navigate({ q: value.trim() }), 350)
  }

  function clearSearch() {
    setQuery('')
    clearTimeout(debounceRef.current)
    navigate({ q: '' })
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">

      {/* Search */}
      <div className="relative flex-1 sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fp-text-tertiary pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search projects or clients…"
          aria-label="Search projects"
          className="
            w-full h-9 pl-9 pr-8 rounded-lg
            bg-fp-surface border border-fp-border
            text-sm text-fp-text-primary placeholder:text-fp-text-tertiary
            focus:outline-none focus:ring-2 focus:ring-fp-accent/30 focus:border-fp-accent/40
            transition-colors duration-150
          "
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fp-text-tertiary hover:text-fp-text-primary transition-colors duration-150"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Status pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto sm:overflow-visible -mx-1 px-1 sm:mx-0 sm:px-0">
        {STATUS_FILTERS.map(({ value, label }) => {
          const isActive = currentStatus === value
          return (
            <button
              key={value || 'all'}
              type="button"
              onClick={() => navigate({ status: value })}
              aria-pressed={isActive}
              className={`
                shrink-0 h-8 px-3 rounded-lg text-xs font-medium transition-colors duration-150
                ${isActive
                  ? 'bg-fp-accent text-black'
                  : 'bg-fp-surface border border-fp-border text-fp-text-secondary hover:text-fp-text-primary hover:border-fp-border/80'}
              `}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Sort */}
      <div className="relative sm:ml-auto shrink-0">
        <select
          value={currentSort}
          onChange={(e) => navigate({ sort: e.target.value })}
          aria-label="Sort projects"
          className="
            h-9 pl-3 pr-8 rounded-lg appearance-none cursor-pointer
            bg-fp-surface border border-fp-border
            text-xs font-medium text-fp-text-secondary hover:text-fp-text-primary
            focus:outline-none focus:ring-2 focus:ring-fp-accent/30
            transition-colors duration-150
          "
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fp-text-tertiary pointer-events-none" />
      </div>

      {isPending && (
        <Loader2 className="w-3.5 h-3.5 text-fp-text-tertiary animate-spin shrink-0" aria-label="Updating results" />
      )}
    </div>
  )
}