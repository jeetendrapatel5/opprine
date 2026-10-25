import { Activity, ClipboardList, Github, Users } from 'lucide-react'
import { can } from './project-permissions'

// Each panel can be gated in two independent ways (both optional):
//
//   requiresFeature     a key from getEntitlements().features that must be
//                       true: the PLAN gate (does this workspace's plan
//                       include it?).
//   requiresPermission  an action name from can(): the ROLE gate (may this
//                       person use it?).
//
// A panel with neither is always visible. This is the ONE place you name
// which panels are gated: wherever PROJECT_PANELS gets rendered just calls
// visibleProjectPanels() below, it never hardcodes panel ids.
//
// Order here is the order of the rows in the project sidebar: the daily
// tools first, one-time setup (GitHub) last.
export const PROJECT_PANELS = [
  { id: 'activity', label: 'Project Activity', icon: Activity },
  { id: 'requests', label: 'Client Requests', icon: ClipboardList },
  { id: 'members', label: 'Project Members', icon: Users },
  {
    id: 'github',
    label: 'GitHub',
    icon: Github,
    requiresFeature: 'githubIntegration',
    requiresPermission: 'linkGithubRepo',
  },
]

// Given an entitlements object (from getEntitlements()) and the viewer's
// project role, returns only the panels they may see. Centralizing the filter
// here too, so every place that renders panels does the same filtering, not
// slightly different versions of it.
//
// Fails CLOSED: if entitlements is missing, a feature-gated panel is hidden;
// if role is missing or unknown, can() returns false, so a permission-gated
// panel is hidden.
export function visibleProjectPanels(entitlements, role) {
  return PROJECT_PANELS.filter(
    (panel) =>
      (!panel.requiresFeature || entitlements?.features?.[panel.requiresFeature]) &&
      (!panel.requiresPermission || can(role, panel.requiresPermission)),
  )
}