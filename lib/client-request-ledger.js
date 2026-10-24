// lib/client-request-ledger.js
//
// Two small READ-ONLY helpers that feed the "waiting on client" signals in the
// UI. They live in their own file (not in lib/client-requests.js) because they
// are used by PAGES that have already checked who the viewer is, and they only
// ever read a few columns.
//
//   getProjectBlockedLedger  - one project's ledger, for the milestone badges
//   getOpenRequestSummaries  - many projects at once, for the dashboard
//
// PERMISSIONS
// getProjectBlockedLedger takes the caller's project ROLE and returns null
// unless that role may view client requests (can(role, 'viewClientRequests')),
// so a page can't forget the check. getOpenRequestSummaries takes project ids
// the CALLER has already filtered by permission (the dashboard does this with
// can()); it never decides access itself.
//
// Both read only the columns they need and never return titles, answers or
// anything the client wrote.

import prisma from './prisma.js'
import { can } from './project-permissions.js'
import { groupBlockedByMilestone } from './blocked-time.js'

// Same ceiling lib/client-requests.js uses for one project's list.
const LEDGER_LIMIT = 500

// -> { project, milestones: { [milestoneId]: summary }, noMilestone } | null
// (see groupBlockedByMilestone in lib/blocked-time.js for the summary shape)
export async function getProjectBlockedLedger({ projectId, role }, db = prisma) {
  if (!can(role, 'viewClientRequests')) return null

  const rows = await db.clientRequest.findMany({
    where: { projectId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: LEDGER_LIMIT,
    select: {
      milestoneId: true,
      blocksWork: true,
      createdAt: true,
      submittedAt: true,
      cancelledAt: true,
    },
  })

  return groupBlockedByMilestone(rows)
}

// For each given project that has at least one OPEN request that blocks work:
//   Map<projectId, { openCount, oldestOpenSince }>
// Projects with nothing waiting are simply absent from the map.
// One grouped query, however many projects there are.
export async function getOpenRequestSummaries(projectIds, db = prisma) {
  const summaries = new Map()
  if (!Array.isArray(projectIds) || projectIds.length === 0) return summaries

  const groups = await db.clientRequest.groupBy({
    by: ['projectId'],
    where: { projectId: { in: projectIds }, status: 'OPEN', blocksWork: true },
    _count: { _all: true },
    _min: { createdAt: true },
  })

  for (const group of groups) {
    summaries.set(group.projectId, {
      openCount: group._count._all,
      oldestOpenSince: group._min.createdAt,
    })
  }
  return summaries
}