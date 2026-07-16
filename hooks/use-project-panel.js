'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export function useProjectPanel(panelId) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isOpen = searchParams.get('panel') === panelId

  const setOpen = useCallback(
    (nextOpen) => {
      const params = new URLSearchParams(searchParams.toString())
      if (nextOpen) {
        params.set('panel', panelId)
      } else if (params.get('panel') === panelId) {
        params.delete('panel')
      }
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [panelId, pathname, router, searchParams],
  )

  return {
    isOpen,
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!isOpen),
  }
}