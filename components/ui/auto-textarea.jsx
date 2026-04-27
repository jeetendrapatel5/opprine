// components/ui/auto-textarea.jsx
'use client'

import { useEffect, useRef } from 'react'

export function AutoTextarea({ value, onChange, className, ...props }) {
  const ref = useRef(null)

  const resize = () => {
    const el = ref.current
    if (!el) return

    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  useEffect(() => {
    resize()
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => {
        onChange(e)
        resize()
      }}
      rows={1}
      className={`w-full resize-none overflow-hidden ${className}`}
      {...props}
    />
  )
}