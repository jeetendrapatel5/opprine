// hooks/useProjectMembers.js
//
// Everything the app needs to fetch and change "who is on this project".
//
//   usePrefetchProjectMembers(projectId)  -> warm the cache from the project page
//   useProjectMembers(projectId)          -> read the roster + canManage
//   useWorkspaceMembers(enabled)          -> people who can be added
//   useProjectMemberMutations(projectId)  -> add / change role / remove
//
// IMPORTANT: the prefetch and the panel build their queries from the SAME
// option functions below (membersOptions / workspaceMembersOptions). Same key +
// same fetch function = TanStack Query treats them as one query. That is what
// stops duplicate requests: if the panel opens while the prefetch is still in
// flight, it waits for that request instead of sending a second one.
//
// SECURITY: `canManage` stored in the cache is only used to show or hide
// buttons. The API re-checks permissions on every request.

import { useEffect } from 'react'
import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCacheScope } from '@/components/QueryProvider'

// ── Cache keys ───────────────────────────────────────────────────────
// 'project-members' comes FIRST so one call can invalidate every project's
// roster at once:  invalidateQueries({ queryKey: ['project-members'] })
// (for example after a person is removed from the whole workspace).
const keys = {
  members: (scope, projectId) => ['project-members', scope.userId, scope.workspaceId, projectId],
  workspaceMembers: (scope) => ['workspace-members', scope.userId, scope.workspaceId],
}

// ── Query options (shared by prefetch and the panel) ─────────────────
function membersOptions(scope, projectId) {
  return {
    queryKey: keys.members(scope, projectId),
    // Returns { members, currentUserId, canManage } exactly as the API sends it.
    queryFn: async () => {
      const { data } = await axios.get(`/api/projects/${projectId}/members`)
      return data
    },
  }
}

function workspaceMembersOptions(scope) {
  return {
    queryKey: keys.workspaceMembers(scope),
    queryFn: async () => {
      const { data } = await axios.get('/api/workspace/members')
      return data.members
    },
    staleTime: 60_000, // the team list changes rarely
  }
}

// 401 (session expired / logged out in another tab), 403 and 404 mean "you may
// not see this" (or you were removed). Unlike a network error, these must
// NEVER fall back to old cached data.
function isDenied(error) {
  const status = error?.response?.status
  return status === 401 || status === 403 || status === 404
}

// ── 1. Prefetch (call from the project page) ─────────────────────────
export function usePrefetchProjectMembers(projectId) {
  const queryClient = useQueryClient()
  const scope = useCacheScope()

  useEffect(() => {
    if (!projectId) return undefined

    let cancelled = false

    const run = async () => {
      if (cancelled) return
      // prefetchQuery never throws, and skips the request if the cache already
      // holds data younger than staleTime. A request already in flight is reused.
      await queryClient.prefetchQuery(membersOptions(scope, projectId))
      if (cancelled) return

      // Only managers can open the Add form, so only they need the workspace list.
      const cached = queryClient.getQueryData(keys.members(scope, projectId))
      if (cached?.canManage) {
        queryClient.prefetchQuery(workspaceMembersOptions(scope))
      }
    }

    // Wait until the browser is idle so the page itself paints first.
    // Safari has no requestIdleCallback, so it gets a short timer instead.
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 2000 })
      return () => {
        cancelled = true
        window.cancelIdleCallback(id)
      }
    }
    const id = window.setTimeout(run, 300)
    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
  }, [queryClient, scope, projectId])
}

// ── 2. Read the roster ───────────────────────────────────────────────
export function useProjectMembers(projectId) {
  const scope = useCacheScope()

  const query = useQuery({
    ...membersOptions(scope, projectId),
    // While the panel is open, check again every 60s so changes made by other
    // people show up. Never in a background tab. Never after a 403/404.
    refetchInterval: (q) => (isDenied(q.state.error) ? false : 60_000),
    refetchIntervalInBackground: false,
  })

  const denied = isDenied(query.error)
  const hasData = Boolean(query.data) && !denied

  return {
    members: hasData ? query.data.members : null, // null = nothing to show yet
    canManage: hasData ? Boolean(query.data.canManage) : false,
    currentUserId: hasData ? (query.data.currentUserId ?? null) : null,
    isLoading: query.isPending, // true ONLY when there is no cached data at all
    accessDenied: denied,
    loadFailed: query.isError && !denied && !query.data, // nothing cached AND failed
    refreshFailed: query.isError && !denied && Boolean(query.data), // cached shown, refresh failed
    reload: query.refetch,
  }
}

// ── 3. People who can be added ───────────────────────────────────────
export function useWorkspaceMembers(enabled) {
  const scope = useCacheScope()
  return useQuery({ ...workspaceMembersOptions(scope), enabled })
}

// ── 4. Changes ───────────────────────────────────────────────────────
// After every change (success OR failure) the roster is refetched, so the UI
// always ends up showing what the server really has. Returning the promise from
// onSettled keeps the mutation "pending" until fresh data arrives, so the row
// spinner does not disappear too early.
export function useProjectMemberMutations(projectId) {
  const queryClient = useQueryClient()
  const scope = useCacheScope()
  const key = keys.members(scope, projectId)

  const refresh = () => queryClient.invalidateQueries({ queryKey: key })

  // The API has no separate "update" route: POST is an upsert, so adding a
  // person and changing a role are the same request.
  const save = ({ userId, role }) =>
    axios.post(`/api/projects/${projectId}/members`, { userId, role })

  const addMember = useMutation({ mutationFn: save, onSettled: refresh })
  const changeRole = useMutation({ mutationFn: save, onSettled: refresh })
  const removeMember = useMutation({
    mutationFn: (userId) => axios.delete(`/api/projects/${projectId}/members/${userId}`),
    onSettled: refresh,
  })

  return { addMember, changeRole, removeMember }
}