'use client'

import { useEffect, useRef } from 'react'
import styles from './landing.module.css'

const lines = ['Give clients a clear view of the work', 'Give your studio a record of delivery']

export default function Tagline() {
  const heading = useRef(null)

  useEffect(() => {
    const element = heading.current
    if (!element || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.dataset.visible = 'true'
        observer.unobserve(entry.target)
      }
    }, { rootMargin: '0px 0px -12% 0px' })

    element.dataset.reveal = 'true'
    element.querySelectorAll('[data-word]').forEach((word) => observer.observe(word))
    return () => observer.disconnect()
  }, [])

  return (
    <div className={styles.tagline}>
      <h3 ref={heading} className={styles.heading3}>
        {lines.map((line, lineIndex) => (
          <span className={styles.taglineLine} key={line}>
            {line.split(' ').map((word, index) => (
              <span key={index} data-word style={{ '--word-delay': `${(lineIndex * 8 + index) * 24}ms` }}>{word}{' '}</span>
            ))}
          </span>
        ))}
      </h3>
    </div>
  )
}
