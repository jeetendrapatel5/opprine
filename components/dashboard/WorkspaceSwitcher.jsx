// components/dashboard/WorkspaceSwitcher.jsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import WorkspaceSwitcherDropdown from './WorkspaceSwitcherDropdown'

export default function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] = useState([])
  const [loaded, setLoaded] = useState(false)

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

  if (!loaded) return null

  return (
    <WorkspaceSwitcherDropdown
      workspaces={workspaces}
      onWorkspaceChanged={loadWorkspaces}
    />
  )
}