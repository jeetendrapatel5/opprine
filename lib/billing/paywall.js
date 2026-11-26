// lib/billing/paywall.js
//
// Paid-only access check. A workspace without a plan granted by
// resolveAccess (no subscription, unpaid, lapsed or expired) is locked
// out of the application and can only reach billing. Path rules live in
// paywall-rules.js.

import prisma from '../prisma.js'
import { getWorkspaceForUser } from '../workspace.js'
import { getEffectivePlan } from './entitlements.js'

// True when the user's active workspace currently has a paid plan.
export async function hasPaidAccess(userId, db = prisma) {
  const membership = await getWorkspaceForUser(userId, db)
  if (!membership) return false
  return (await getEffectivePlan(membership.workspaceId, db)) !== 'FREE'
}
