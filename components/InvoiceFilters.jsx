'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function InvoiceFilters({ activeStatus, activeQuery, counts }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(activeQuery || '')
  const [, startTransition] = useTransition()

  // Debounced URL sync for the search field — status pills update immediately.
  useEffect(() => {
    const handle = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString())
      if (search) next.set('q', search)
      else next.delete('q')
      startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }))
    }, 300)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function setStatus(value) {
    const next = new URLSearchParams(searchParams.toString())
    if (value === 'all') next.delete('status')
    else next.set('status', value)
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }))
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
      <div className="flex items-center gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = activeStatus === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-fp-accent/8 text-fp-accent-hover border border-fp-accent/20'
                  : 'text-fp-text-secondary border border-transparent hover:text-fp-text-primary hover:bg-fp-surface'
              }`}
            >
              {tab.label}
              <span className={isActive ? 'text-fp-accent-hover text-xs' : 'text-fp-text-tertiary text-xs'}>
                {counts?.[tab.value] ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      <div className="relative sm:ml-auto sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fp-text-tertiary" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search invoices…"
          className="w-full bg-fp-surface border border-fp-border rounded-lg pl-8 pr-3 py-2 text-sm text-fp-text-primary placeholder:text-fp-text-tertiary focus:outline-none focus:ring-2 focus:ring-fp-accent/30"
        />
      </div>
    </div>
  )
}