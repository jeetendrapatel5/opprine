// lib/billing/paywall-rules.js
//
// Pure paywall rules with no database access, so they can be imported from
// anywhere. See paywall.js for the access check itself.

export const BILLING_PATH = '/dashboard/settings/billing'
export const PAYWALL_STATUS = 402

// API prefixes reachable without a paid workspace: sign-in, billing itself,
// provider callbacks, the public client portal and the public forms.
const EXEMPT_PREFIXES = [
  '/api/auth',
  '/api/billing',
  '/api/cron',
  '/api/webhooks',
  '/api/portal',
  '/api/inquiries',
  '/api/invites',
  '/api/notifications',
  '/api/users',
]
const EXEMPT_EXACT = new Set(['/api/workspace', '/api/workspace/list', '/api/workspace/switch'])
const EXEMPT_PATTERNS = [/^\/api\/projects\/[^/]+\/(inquire|cover-image)$/]

function hasPrefix(path, prefix) {
  return path === prefix || path.startsWith(`${prefix}/`)
}

export function isPaywallExemptApi(path) {
  return (
    EXEMPT_EXACT.has(path) ||
    EXEMPT_PREFIXES.some((prefix) => hasPrefix(path, prefix)) ||
    EXEMPT_PATTERNS.some((pattern) => pattern.test(path))
  )
}

export function isBillingPath(path) {
  return hasPrefix(path, BILLING_PATH)
}
