'use client'

// components/portal/PortalNav.jsx
// In-page section links for the sticky header. Plain anchors, so it works
// without JS; the observer only adds the "current section" highlight.

import { useEffect, useState } from 'react'
import { focusRing } from './ui'

export default function PortalNav({ items, className = '' }) {
  const [active, setActive] = useState(items[0]?.id)
  const idsKey = items.map((item) => item.id).join(',')

  useEffect(() => {
    const targets = idsKey
      .split(',')
      .map((id) => document.getElementById(id))
      .filter(Boolean)
    if (targets.length === 0) return

    // A section counts as current once it crosses the band just below the header.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-112px 0px -60% 0px' },
    )
    targets.forEach((target) => observer.observe(target))
    return () => observer.disconnect()
  }, [idsKey])

  return (
    <nav aria-label="Page sections" className={className}>
      <ul className="-mx-1 flex gap-1 overflow-x-auto p-1 [scrollbar-width:none]">
        {items.map((item) => {
          const isActive = active === item.id
          return (
            <li key={item.id} className="shrink-0">
              <a
                href={`#${item.id}`}
                aria-current={isActive ? 'location' : undefined}
                className={`flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors duration-150 md:min-h-9 ${focusRing} ${
                  isActive
                    ? 'bg-fp-portal-raised text-fp-portal-text-primary'
                    : 'text-fp-portal-text-secondary hover:bg-fp-portal-raised hover:text-fp-portal-text-primary'
                }`}
              >
                {item.label}
                {item.badge > 0 && (
                  <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-fp-portal-accent-strong px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
                    {item.badge}
                  </span>
                )}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
