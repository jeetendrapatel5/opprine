'use client'

import { useState } from 'react'
import { Link2, Check } from 'lucide-react'

export default function CopyLinkButton({ url }) {
  const [copied, setCopied] = useState(false)

  if (!url) {
    return <span className="text-fp-text-tertiary text-xs">—</span>
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API unavailable in this context — link is still on the invoice.
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-fp-text-secondary hover:text-fp-accent-hover transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-fp-accent" /> : <Link2 className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy link'}
    </button>
  )
}