// lib/format.js
// Shared formatting helpers used across the dashboard.
// Extracted from app/dashboard/projects/[id]/page.jsx so it isn't duplicated
// in GithubConnectPanel.jsx too.

export function timeAgoShort(date) {
  if (!date) return null
  const diffMs = Date.now() - new Date(date).getTime()
  if (Number.isNaN(diffMs)) return null
  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}