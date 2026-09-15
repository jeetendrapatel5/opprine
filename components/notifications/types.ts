// components/notifications/types.ts
//
// One shared shape for "a notification, as the API returns it." Kept in
// its own tiny file so all four notification components import the SAME
// type instead of four slightly-different inline copies drifting apart.
// This mirrors (but doesn't literally share code with) the `select` in
// getNotificationsForUser() in lib/notifications/service.js — if you add
// a field to that select, add it here too.

export type NotificationData = {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  readAt: string | null
  projectId: string | null
  metadata: Record<string, any> | null
  createdAt: string
}