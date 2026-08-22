import { Activity, Github } from 'lucide-react'

// requiresFeature (optional) names a key from getEntitlements().features
// that must be true for this panel to show. Panels with no
// requiresFeature are always visible. This is the ONE place you name
// which panels are gated — wherever PROJECT_PANELS gets rendered just
// filters on this field, it never hardcodes panel ids.
export const PROJECT_PANELS = [
  { id: 'github', label: 'Connect', icon: Github, requiresFeature: 'githubIntegration' },
  { id: 'activity', label: 'Activity', icon: Activity },
]

// Given an entitlements object (from getEntitlements()), returns only
// the panels this workspace is allowed to see. Centralizing the filter
// logic here too, so every place that renders panels does the same
// `PROJECT_PANELS.filter(...)` — not slightly different versions of it.
export function visibleProjectPanels(entitlements) {
  return PROJECT_PANELS.filter(
    (panel) => !panel.requiresFeature || entitlements?.features?.[panel.requiresFeature]
  )
}