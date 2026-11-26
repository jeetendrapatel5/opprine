'use client'

// components/legal/LegalToc.jsx
//
// The "On this page" list on desktop. It stays in view while the reader
// scrolls and marks the section they are in. The mobile version is a plain
// <details> in LegalPage and needs no JavaScript.

import { useEffect, useState } from 'react'
import { pickActiveSection } from '@/lib/legal/sections'

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#17130F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFAFA]'

// How far below the top of the screen a heading counts as "reached".
const OFFSET = 120

export default function LegalToc({ sections }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? null)

  useEffect(() => {
    let frame = 0

    function update() {
      frame = 0
      const items = sections
        .map(({ id }) => {
          const el = document.getElementById(id)
          return el ? { id, top: el.getBoundingClientRect().top } : null
        })
        .filter(Boolean)
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      setActiveId(pickActiveSection(items, OFFSET, atBottom))
    }

    // One update per frame, however many scroll events arrive.
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [sections])

  return (
    <nav aria-label="On this page" className="hidden lg:block print:hidden">
      <div className="sticky top-8">
        <p className="text-[13px] font-semibold text-[#17130F]">On this page</p>
        <ol className="mt-4 border-l border-[#E7E0D3]">
          {sections.map(({ id, title, number }) => {
            const active = id === activeId
            return (
              <li key={id}>
                <a
                  href={`#${id}`}
                  aria-current={active ? 'location' : undefined}
                  className={`-ml-px flex gap-3 border-l-2 py-2 pl-4 text-[14px] leading-5 transition-colors duration-150 ${FOCUS} ${
                    active
                      ? 'border-[#1E6F45] font-semibold text-[#17130F]'
                      : 'border-transparent text-[#6F675C] hover:text-[#17130F]'
                  }`}
                >
                  <span aria-hidden="true" className="w-5 shrink-0 text-[12px] tabular-nums text-[#6F675C]">
                    {number}
                  </span>
                  <span>{title}</span>
                </a>
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}