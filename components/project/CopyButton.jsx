'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

/**
 * CopyButton — copies `value` to the clipboard and shows transient confirmation.
 *
 * Props:
 *   value     {string}  The string to copy. Pass '#' or omit to disable.
 *   label     {string?} If provided, renders next to the icon as button text.
 *   className {string?} Extra classes for the button element.
 */
export default function CopyButton({ value, label, className = '' }) {
  const [copied, setCopied] = useState(false)

  const disabled = !value || value === '#'

  const handleCopy = async () => {
    if (disabled) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available — silently ignore
    }
  }

  const Icon = copied ? Check : Copy

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled}
      title={label ?? (copied ? 'Copied!' : 'Copy to clipboard')}
      aria-label={label ?? (copied ? 'Copied!' : 'Copy to clipboard')}
      className={[
        'inline-flex items-center gap-1.5 transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fp-accent',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        className,
      ].join(' ')}
    >
      <Icon
        className={[
          'w-3.5 h-3.5 shrink-0',
          copied ? 'text-fp-success' : '',
        ].join(' ')}
      />
      {label && (
        <span className="text-xs font-medium">
          {copied ? 'Copied!' : label}
        </span>
      )}
    </button>
  )
}