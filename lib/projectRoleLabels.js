// lib/projectRoleLabels.js
//
// Single source of truth for turning a raw ProjectRole enum value
// (schema.prisma) into a human-friendly label. Deliberately its own
// file, NOT folded into lib/project.js — that file imports prisma at
// the top, so anything bundled from it would drag a database client
// into the browser the moment a Client Component (like
// ProjectTeamMember below) imports it. This file has zero dependencies
// and is safe to import from either side.
//
// Mirrors the ProjectRole enum in schema.prisma exactly:
//   PROJECT_MANAGER | CONTRIBUTOR | VIEWER
// If a new role is ever added to that enum, add it here too — anything
// that displays a project role (the portal team dialog today, any
// future internal "who's staffed on this" UI) should read from this
// one map instead of re-hardcoding label strings per component.
export const PROJECT_ROLE_LABELS = {
  PROJECT_MANAGER: 'Project Manager',
  CONTRIBUTOR: 'Contributor',
  VIEWER: 'Viewer',
}

export function getProjectRoleLabel(role) {
  return PROJECT_ROLE_LABELS[role] ?? 'Team Member'
}