'use client'

import { useState, useEffect, useCallback } from 'react'

const SECTIONS = [
  { id: 'overview',   label: 'Overview'   },
  { id: 'milestones', label: 'Milestones' },
  { id: 'activity',   label: 'Activity'   },
]

export default function ProjectInPageNav() {
  const [active, setActive] = useState('overview')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id)
        })
      },
      // Trigger when a section crosses 10% from the top of the viewport
      { rootMargin: '-10% 0px -80% 0px', threshold: 0 },
    )

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const scrollTo = useCallback((id) => {
    // scrollIntoView + CSS scroll-mt on sections handles the offset cleanly
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <nav
      aria-label="Project sections"
      className="
        sticky top-14 z-20
        -mx-4 sm:-mx-6
        px-4 sm:px-6
        bg-fp-base/[.97] backdrop-blur-sm
        border-b border-fp-border
        mb-8
      "
    >
      <div
        className="flex items-center h-10 gap-0.5 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {SECTIONS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            className={[
              'shrink-0 px-3 py-1 rounded-md text-[11px] font-semibold tracking-wide',
              'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-fp-accent focus-visible:ring-offset-1',
              active === id
                ? 'bg-fp-surface text-fp-text-primary'
                : 'text-fp-text-tertiary hover:text-fp-text-secondary hover:bg-fp-surface/60',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}