// components/QueryProvider.jsx
//
// Owns the ONE in-browser cache for the dashboard (TanStack Query).
//
// ISOLATION: the cache belongs to one (user, workspace) pair. The outer
// component gives the inner one a `key` made from both ids. When either id
// changes (account switch, workspace switch) React throws the old inner
// component away and builds a new one with a brand-new, EMPTY cache. The old
// cache is also cleared explicitly on unmount (so logout, which unmounts the
// dashboard, wipes it too).
//
// The cache lives in memory only. Nothing is written to localStorage or
// IndexedDB, so it cannot grow forever on disk, cannot survive a logout, and
// cannot leak to the next person who uses the same browser.
//
// Usage (in the dashboard layout, a server component):
//   <QueryProvider userId={session.user.id} workspaceId={membership.workspaceId}>
//     {children}
//   </QueryProvider>

'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const CacheScopeContext = createContext(null)

// Hooks call this to build cache keys that include user + workspace.
export function useCacheScope() {
  const scope = useContext(CacheScopeContext)
  if (!scope) {
    throw new Error('useCacheScope must be used inside <QueryProvider>')
  }
  return scope
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // For 30s data counts as "fresh": opening the panel again inside that
        // window makes NO network request.
        staleTime: 30_000,
        // A query nobody is watching is deleted from memory after 10 minutes.
        gcTime: 10 * 60_000,
        // Come back to the tab, or the network returns: quietly refresh.
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        // Retry only failures that can fix themselves (network, 5xx, 408, 429).
        // 401/403/404 will not change by asking again.
        retry: (failureCount, error) => {
          const status = error?.response?.status
          if (status && status < 500 && status !== 408 && status !== 429) return false
          return failureCount < 2
        },
      },
    },
  })
}

function ScopedProvider({ userId, workspaceId, children }) {
  // useState with a function: the client is created ONCE per mount.
  const [client] = useState(makeQueryClient)

  // Same object between renders, so hooks that depend on it do not re-run.
  const scope = useMemo(() => ({ userId, workspaceId }), [userId, workspaceId])

  // Cleanup runs when this component is thrown away (scope change / unmount).
  useEffect(() => () => client.clear(), [client])

  return (
    <QueryClientProvider client={client}>
      <CacheScopeContext.Provider value={scope}>{children}</CacheScopeContext.Provider>
    </QueryClientProvider>
  )
}

export default function QueryProvider({ userId, workspaceId, children }) {
  return (
    <ScopedProvider key={`${userId}:${workspaceId}`} userId={userId} workspaceId={workspaceId}>
      {children}
    </ScopedProvider>
  )
}