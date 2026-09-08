// components/dashboard/WorkspaceSwitcher.jsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import WorkspaceSwitcherDropdown from './WorkspaceSwitcherDropdown'

// Confirmed against app/dashboard/projects/[id]/page.jsx — the real
// route is plural ("projects"), not "project". Two earlier guesses
// (singular, with and without an /app prefix) were both wrong, which
// is why the redirect never fired before.
const PROJECT_PAGE_PREFIX = '/dashboard/projects/'
const DASHBOARD_PATH = '/dashboard'

export default function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] = useState([])
  const [loaded, setLoaded] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const loadWorkspaces = useCallback(() => {
    return fetch('/api/workspace/list')
      .then((res) => res.json())
      .then((data) => {
        setWorkspaces(data.workspaces ?? [])
      })
      .catch(() => {
        // Network hiccup — keep whatever we last had rather than clobber it.
      })
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    loadWorkspaces()
  }, [loadWorkspaces])

  // Fires only when the user actually switches (or creates) a workspace in
  // the dropdown — not on the plain page-load fetch in the useEffect above.
  //
  // This is the fast path for the common case (same tab, dropdown click).
  // It is NOT the only safety net: app/dashboard/projects/[id]/page.jsx
  // has its own server-side check for direct links, refreshes, and other
  // tabs, which this redirect can't reach.
  const handleWorkspaceChanged = useCallback(() => {
    if (pathname?.startsWith(PROJECT_PAGE_PREFIX)) {
      router.replace(DASHBOARD_PATH)
    }

    return loadWorkspaces()
  }, [pathname, router, loadWorkspaces])

  if (!loaded) return null

  return (
    <WorkspaceSwitcherDropdown
      workspaces={workspaces}
      onWorkspaceChanged={handleWorkspaceChanged}
    />
  )
}