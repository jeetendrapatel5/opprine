// lib/notifications/constants.js
//
// Every notification TYPE the app knows about, in one place — same
// discipline WorkspaceRole and ProjectRole already get from being Prisma
// enums, just enforced in plain JS here because these values need to be
// usable in object literals (this file's NOTIFICATION_META, and the
// rules registry in lib/notifications/rules.js) in a way a Prisma enum
// import isn't convenient for.
//
// IMPORTANT — this file only decides two things: WHAT TYPES EXIST, and
// HOW THEY DISPLAY (icon + link). It does NOT decide who receives a
// notification or what it says — that behavior lives entirely in
// lib/notifications/rules.js. If you're here to add a new notification
// rule, this is step 1 of 4 — see the big comment at the top of
// lib/notifications/triggers.js for the full process.

export const NOTIFICATION_TYPES = {
  MILESTONE_APPROVAL_PENDING: 'MILESTONE_APPROVAL_PENDING',
  WORKSPACE_INVITE: 'WORKSPACE_INVITE',
  PROJECT_ASSIGNED: 'PROJECT_ASSIGNED',
  MILESTONE_UPDATE_POSTED: 'MILESTONE_UPDATE_POSTED',
  MILESTONE_DELIVERABLE_UPLOADED: 'MILESTONE_DELIVERABLE_UPLOADED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  PROJECT_UPDATE_POSTED: 'PROJECT_UPDATE_POSTED',
  PROJECT_FILE_UPLOADED: 'PROJECT_FILE_UPLOADED',
}

// One entry per type above — icon + link target ONLY. `icon` is a
// STRING (a lucide-react icon name), not the component itself — this
// file also runs on the server, where importing a React component would
// be wrong. components/notifications/NotificationItem.tsx does the
// name → component lookup on the client. If you add a type, mirror the
// icon name you pick here into that file's TYPE_ICON map too — the two
// are kept in sync by hand, not shared code, since one is server-side
// config and the other is a client-side lookup table.
export const NOTIFICATION_META = {
  [NOTIFICATION_TYPES.MILESTONE_APPROVAL_PENDING]: {
    icon: 'CircleCheck',
    buildHref: (n) =>
      n.projectId
        ? `/dashboard/projects/${n.projectId}?milestone=${n.metadata?.milestoneId ?? ''}`
        : null,
  },
  [NOTIFICATION_TYPES.WORKSPACE_INVITE]: {
    icon: 'UserRoundPlus',
    buildHref: (n) => (n.metadata?.inviteToken ? `/invite/${n.metadata.inviteToken}` : null),
  },
  [NOTIFICATION_TYPES.PROJECT_ASSIGNED]: {
    icon: 'FolderKanban',
    buildHref: (n) => (n.projectId ? `/dashboard/projects/${n.projectId}` : null),
  },
  [NOTIFICATION_TYPES.MILESTONE_UPDATE_POSTED]: {
    icon: 'MessageSquareText',
    buildHref: (n) =>
      n.projectId ? `/dashboard/projects/${n.projectId}?milestone=${n.metadata?.milestoneId ?? ''}` : null,
  },
  [NOTIFICATION_TYPES.MILESTONE_DELIVERABLE_UPLOADED]: {
    icon: 'Paperclip',
    buildHref: (n) =>
      n.projectId ? `/dashboard/projects/${n.projectId}?milestone=${n.metadata?.milestoneId ?? ''}` : null,
  },
  [NOTIFICATION_TYPES.TASK_COMPLETED]: {
    icon: 'CheckCircle2',
    buildHref: (n) => (n.projectId ? `/dashboard/projects/${n.projectId}` : null),
  },
  [NOTIFICATION_TYPES.PROJECT_UPDATE_POSTED]: {
    icon: 'MessageSquareText',
    // FLAGGED ASSUMPTION: links to the plain project page. If your
    // project detail page uses a query param to land directly on the
    // Updates tab (the way milestone links use ?milestone=...), tell me
    // the param name and I'll add it here — e.g. `?tab=updates`.
    buildHref: (n) => (n.projectId ? `/dashboard/projects/${n.projectId}` : null),
  },
  [NOTIFICATION_TYPES.PROJECT_FILE_UPLOADED]: {
    icon: 'Paperclip',
    buildHref: (n) => (n.projectId ? `/dashboard/projects/${n.projectId}` : null),
  },
}