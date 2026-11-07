'use client'

import { useEffect, useRef, useTransition } from 'react'
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

  const searchInputRef = useRef(null)
  const clearButtonRef = useRef(null)
  const debounceRef = useRef(null)

  // Keep the uncontrolled input in sync with browser back/forward navigation
  // without mirroring URL state into React state.
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.value = currentQ
    }
    if (clearButtonRef.current) {
      clearButtonRef.current.hidden = currentQ.length === 0
    }
    window.clearTimeout(debounceRef.current)
    debounceRef.current = null
  }, [currentQ])

  useEffect(() => {
    return () => window.clearTimeout(debounceRef.current)
  }, [])

  function navigate(updates) {
    window.clearTimeout(debounceRef.current)
    debounceRef.current = null

    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined) {
        params.delete(key)
      } else {
        params.set(key, String(value))
      }
    })

    // Any filter change invalidates the current page offset.
    if (!Object.prototype.hasOwnProperty.call(updates, 'page')) {
      params.delete('page')
    }

    const queryString = params.toString()
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
    })
  }

  function handleSearchChange(event) {
    const value = event.target.value
    if (clearButtonRef.current) {
      clearButtonRef.current.hidden = value.length === 0
    }
    window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null
      navigate({ q: value.trim() })
    }, 350)
  }

  function clearSearch() {
    if (searchInputRef.current) {
      searchInputRef.current.value = ''
    }
    if (clearButtonRef.current) {
      clearButtonRef.current.hidden = true
    }
    navigate({ q: '' })
  }

  // Commit any text currently being typed when another filter is selected,
  // rather than cancelling an in-flight debounce and losing the user's query.
  function navigateWithCurrentSearch(updates) {
    const searchValue = searchInputRef.current?.value.trim() ?? currentQ
    navigate({ q: searchValue, ...updates })
  }

  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fp-text-tertiary" />
        <input
          ref={searchInputRef}
          type="text"
          defaultValue={currentQ}
          onChange={handleSearchChange}
          placeholder="Search projects or clients…"
          aria-label="Search projects"
          className="h-9 w-full rounded-lg border border-fp-border bg-fp-surface pl-9 pr-8 text-sm text-fp-text-primary placeholder:text-fp-text-tertiary transition-colors duration-150 focus:border-fp-accent/40 focus:outline-none focus:ring-2 focus:ring-fp-accent/30"
        />
        <button
            ref={clearButtonRef}
            type="button"
            hidden={!currentQ}
            onClick={clearSearch}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fp-text-tertiary transition-colors duration-150 hover:text-fp-text-primary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
      </div>

      <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 sm:mx-0 sm:overflow-visible sm:px-0">
        {STATUS_FILTERS.map(({ value, label }) => {
          const isActive = currentStatus === value
          return (
            <button
              key={value || 'all'}
              type="button"
              onClick={() => navigateWithCurrentSearch({ status: value })}
              aria-pressed={isActive}
              className={`shrink-0 rounded-lg px-3 text-xs font-medium transition-colors duration-150 ${
                isActive
                  ? 'h-8 bg-fp-accent text-black'
                  : 'h-8 border border-fp-border bg-fp-surface text-fp-text-secondary hover:border-fp-border/80 hover:text-fp-text-primary'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="relative shrink-0 sm:ml-auto">
        <select
          value={currentSort}
          onChange={(event) => navigateWithCurrentSearch({ sort: event.target.value })}
          aria-label="Sort projects"
          className="h-9 cursor-pointer appearance-none rounded-lg border border-fp-border bg-fp-surface pl-3 pr-8 text-xs font-medium text-fp-text-secondary transition-colors duration-150 hover:text-fp-text-primary focus:outline-none focus:ring-2 focus:ring-fp-accent/30"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fp-text-tertiary" />
      </div>

      {isPending && (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-fp-text-tertiary" aria-label="Updating results" />
      )}
    </div>
  )
}
