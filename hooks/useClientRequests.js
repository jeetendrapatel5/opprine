// hooks/useClientRequests.js
//
// Everything the team-side Client Requests panel fetches and changes.
//
//   useClientRequests(projectId, enabled)  -> the list + blocked-time ledger
//   useCreateClientRequests(projectId)     -> send one or more requests
//   useUpdateClientRequest(projectId)      -> accept | cancel | edit one request
//
// The list is always re-checked when the panel opens (staleTime 0). Cached
// data is shown straight away while that happens, so reopening never flashes a
// spinner. After a change the list is refetched, then router.refresh() keeps
// the server-rendered parts of the page in sync.
//
// SECURITY: nothing here decides who may do what. The API re-checks
// permissions on every call.

import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useCacheScope } from '@/components/QueryProvider'

const requestsKey = (scope, projectId) => [
  'client-requests',
  scope.userId,
  scope.workspaceId,
  projectId,
]

// 401, 403 and 404 mean "you may not see this" (or it is gone). Unlike a
// network error, they must NEVER fall back to old cached data.
function isDenied(error) {
  const status = error?.response?.status
  return status === 401 || status === 403 || status === 404
}

// 409 / 404 on a change mean the list on screen is stale (for example the
// client just answered): it needs reloading even though the change failed.
const isStale = (error) => [404, 409].includes(error?.response?.status)

export function useClientRequests(projectId, enabled = true) {
  const scope = useCacheScope()

  const query = useQuery({
    queryKey: requestsKey(scope, projectId),
    // Returns { requests, blocked } exactly as the API sends it.
    queryFn: async () => {
      const { data } = await axios.get(`/api/projects/${projectId}/requests`)
      return data
    },
    enabled,
    staleTime: 0,
  })

  const denied = isDenied(query.error)
  const data = denied ? undefined : query.data

  return {
    requests: data?.requests ?? [],
    blocked: data?.blocked ?? null,
    isLoading: enabled && query.isPending, // true ONLY when nothing is cached
    accessDenied: denied,
    loadFailed: query.isError && !denied && !query.data, // nothing cached AND failed
    refreshFailed: query.isError && !denied && Boolean(query.data), // cached shown, refresh failed
    isRefetching: query.isFetching && !query.isPending,
    reload: query.refetch,
  }
}

// Reload the list, then refresh server components. Returning the promise keeps
// the mutation "pending" until fresh data has arrived, so a button's spinner
// does not stop too early.
function useReloadAfterChange(projectId) {
  const queryClient = useQueryClient()
  const scope = useCacheScope()
  const router = useRouter()
  const queryKey = requestsKey(scope, projectId)

  return {
    reload: () => queryClient.invalidateQueries({ queryKey }),
    afterChange: async () => {
      await queryClient.invalidateQueries({ queryKey })
      router.refresh()
    },
  }
}

// Resolves to { requests, emailSent }.
export function useCreateClientRequests(projectId) {
  const { afterChange } = useReloadAfterChange(projectId)

  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await axios.post(`/api/projects/${projectId}/requests`, payload)
      return data
    },
    onSuccess: afterChange,
  })
}

// Variables: { requestId, body } where body is { action: 'accept' | 'cancel' }
// or { action: 'update', title?, instructions?, dueDate? }.
export function useUpdateClientRequest(projectId) {
  const { reload, afterChange } = useReloadAfterChange(projectId)

  return useMutation({
    mutationFn: async ({ requestId, body }) => {
      const { data } = await axios.patch(`/api/projects/${projectId}/requests/${requestId}`, body)
      return data
    },
    onSuccess: afterChange,
    onError: (error) => (isStale(error) ? reload() : undefined),
  })
}
