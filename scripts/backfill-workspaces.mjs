// scripts/backfill-workspaces.js
//
// Run once, manually, after the "add_workspace_and_billing" migration.
// Safe to run more than once — see the `skip if already migrated` check
// below.
//
// Usage:
//   node scripts/backfill-workspaces.js
//
// What it does, for every existing User:
//   1. If they already have a WorkspaceMember row, skip them (already done).
//   2. Otherwise, in one transaction:
//        a. Create a Workspace for them.
//        b. Create a WorkspaceMember row (role OWNER) linking User <-> Workspace.
//        c. Set workspaceId on all of their Projects that don't have one yet.

import { prisma } from '../lib/prisma.js'
import { createWorkspaceForUser } from '../lib/workspace.js'
// ^ Reusing your existing shared client — same connection pool as the
//   rest of the app, not a separate one. See our earlier discussion.

async function backfillOneUser(user) {
  // Step 1: has this user already been migrated?
  // We check WorkspaceMember, not Workspace directly, because
  // WorkspaceMember is the join table that actually proves
  // "this user belongs to a workspace."
  const existingMembership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
  })

  if (existingMembership) {
    // Already migrated in a previous run of this script — do nothing.
    return { userId: user.id, status: 'skipped-already-migrated' }
  }

  // Step 2: do the actual migration for this one user as a single
  // transaction. If ANY of these three writes fails, Prisma rolls back
  // ALL of them — so we never end up with, say, a Workspace that has
  // a member but zero projects pointing at it because step (c) failed
  // halfway through.
  const result = await prisma.$transaction(async (tx) => {
    // (a) + (b): create the workspace and make this user its OWNER —
    // now delegated to the same function the signup flow uses.
    const workspace = await createWorkspaceForUser(user.id, {
      name: `${user.name}'s Workspace`,
      db: tx,
    })

    // (c) Point all of this user's existing projects at the new
    // workspace. `updateMany` is used (not a loop of individual
    // `update` calls) because it's a single SQL statement — faster,
    // and avoids the "half the projects updated, then it crashed"
    // problem within this one user's batch.
    const { count } = await tx.project.updateMany({
      where: {
        userId: user.id,
        workspaceId: null, // only touch projects not already assigned
      },
      data: {
        workspaceId: workspace.id,
      },
    })

    return { workspaceId: workspace.id, projectsMoved: count }
  })

  return { userId: user.id, status: 'migrated', ...result }
}

async function main() {
  // Cursor-based pagination: instead of loading every User into memory
  // at once (which could be a problem if you ever have, say, 50,000
  // users), we fetch them in pages of 100, remembering the last id
  // we saw ("cursor") to fetch the next page.
  const PAGE_SIZE = 100
  let cursor = undefined
  let totalMigrated = 0
  let totalSkipped = 0

  while (true) {
    const users = await prisma.user.findMany({
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: { id: true, name: true },
    })

    if (users.length === 0) break

    for (const user of users) {
      const result = await backfillOneUser(user)
      if (result.status === 'migrated') {
        totalMigrated += 1
        console.log(
          `migrated user ${result.userId} -> workspace ${result.workspaceId} (${result.projectsMoved} project(s) moved)`
        )
      } else {
        totalSkipped += 1
      }
    }

    cursor = users[users.length - 1].id
  }

  console.log(`\nDone. Migrated: ${totalMigrated}, already-done/skipped: ${totalSkipped}`)
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
