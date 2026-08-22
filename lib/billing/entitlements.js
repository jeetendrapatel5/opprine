// lib/billing/entitlements.js
//
// THE gatekeeper. Every API route that creates a project, adds a client,
// invites a workspace member, etc. calls a function from here FIRST —
// instead of writing its own `if (count >= someNumber)` check.
//
// Data flow:
//   1. Look up the workspace's Subscription row (source of truth for
//      which plan they're on, and whether that plan is currently valid).
//   2. If there's no Subscription row, or its status isn't ACTIVE, treat
//      the workspace as FREE. This is the "safe default" — if something
//      is wrong or missing, we fail toward the most restrictive plan,
//      never toward unlimited access.
//   3. Read the limit for that plan from plans.js.
//   4. Count *actual current usage* from the database (not a cached
//      number) — so this is always correct even if something else
//      changed the data.

import prisma from '../prisma.js'
import { getLimit, getPlanConfig } from './plans.js'

// Given a workspace, returns which plan is currently in force.
// This is intentionally the ONLY function in the codebase that decides
// "is this subscription actually usable right now."
//
// `db` defaults to the shared global `prisma` client, but callers that
// need this read to happen INSIDE a transaction (e.g. so it's covered
// by an advisory lock — see app/api/projects/route.js) can pass `tx`
// instead. Same function, same logic, just reads through whichever
// connection you give it.
export async function getEffectivePlan(workspaceId, db = prisma) {
  const subscription = await db.subscription.findUnique({
    where: { workspaceId },
  })

  if (!subscription) {
    // No subscription row at all — brand new workspace, defaults to FREE.
    return 'FREE'
  }

  // ACTIVE is the only status that grants the paid plan's limits.
  // PAST_DUE / CANCELLED / EXPIRED all fall back to FREE limits, even
  // though the row still says e.g. plan: 'PRO' — because status tells us
  // whether that plan is *currently earned*, not just what it was.
  if (subscription.status !== 'ACTIVE') {
    return 'FREE'
  }

  return subscription.plan
}

// Counts current usage for the things that have limits.
// Add a new key here whenever you add a new limited resource.
async function getCurrentUsage(workspaceId, db = prisma) {
  const [projectCount, clientCount, memberCount] = await Promise.all([
    db.project.count({ where: { workspaceId } }),
    db.client.count({ where: { project: { workspaceId } } }),
    db.workspaceMember.count({ where: { workspaceId } }),
  ])

  return {
    maxProjects: projectCount,
    maxClients: clientCount,
    maxWorkspaceMembers: memberCount,
  }
}

// The main function other code should call. Returns a full picture:
// what plan they're on, what they've used, what they're allowed, and
// simple booleans for "can they do X right now."
//
// Example usage in an API route:
//   const entitlements = await getEntitlements(workspaceId)
//   if (!entitlements.canCreateProject) {
//     return Response.json({ error: 'Project limit reached' }, { status: 403 })
//   }
export async function getEntitlements(workspaceId, db = prisma) {
  const plan = await getEffectivePlan(workspaceId, db)
  const config = getPlanConfig(plan)
  const usage = await getCurrentUsage(workspaceId, db)

  return {
    plan,
    displayName: config.displayName,
    usage: {
      projects: { used: usage.maxProjects, limit: config.limits.maxProjects },
      clients: { used: usage.maxClients, limit: config.limits.maxClients },
      workspaceMembers: {
        used: usage.maxWorkspaceMembers,
        limit: config.limits.maxWorkspaceMembers,
      },
    },
    features: {
      githubIntegration: config.limits.githubIntegration,
      customBranding: config.limits.customBranding,
    },
    canCreateProject: usage.maxProjects < config.limits.maxProjects,
    canAddClient: usage.maxClients < config.limits.maxClients,
    canAddWorkspaceMember: usage.maxWorkspaceMembers < config.limits.maxWorkspaceMembers,
  }
}

// Convenience function for API routes that just want a yes/no + reason,
// without pulling the full entitlements object apart themselves.
//
// Example:
//   const check = await assertWithinLimit(workspaceId, 'maxProjects')
//   if (!check.allowed) return Response.json({ error: check.reason }, { status: 403 })
export async function assertWithinLimit(workspaceId, limitKey, db = prisma) {
  const plan = await getEffectivePlan(workspaceId, db)
  const limit = getLimit(plan, limitKey)
  const usage = await getCurrentUsage(workspaceId, db)

  const used = usage[limitKey]
  if (used === undefined) {
    throw new Error(`assertWithinLimit: unknown limitKey "${limitKey}"`)
  }

  if (used >= limit) {
    return {
      allowed: false,
      reason: `Your ${getPlanConfig(plan).displayName} plan allows up to ${limit === Infinity ? 'unlimited' : limit} for this — you're at ${used}. Upgrade to add more.`,
      plan,
      used,
      limit,
    }
  }

  return { allowed: true, plan, used, limit }
}