// lib/github-push.js
//
// Saves one GitHub push as a project Update PLUS its activity event, exactly
// once, even if GitHub delivers the same push more than once.
//
// WHY THE ORDER IS "EVENT FIRST, UPDATE SECOND"
// The activity event's dedupe key is the full commit sha (see GITHUB_PUSH in
// lib/project-activity.js) and the database enforces it as unique per project.
// So inserting the event is how we CLAIM the push:
//   - the insert goes through  -> we are the first, so we create the Update;
//   - the insert is skipped    -> this push was already recorded, so we create
//                                 nothing and the client never sees a duplicate.
// Two deliveries arriving at the same moment cannot both win: the second insert
// waits for the first transaction, then is skipped.
//
// The Update gets an id we generate up front, so the event can point at it
// before the Update row exists. Both rows are written in ONE transaction.
//
// `db` is required (no default): like lib/project-activity.js this file never
// imports the global prisma client, so it can be tested without a database.

import { randomUUID } from 'node:crypto'
import { recordActivity } from './project-activity.js'

const SHORT_SHA_LENGTH = 7

// `project`: { id }   `commit`: one commit from GitHub's payload { id, url }
// `summary`: the client-friendly text written by the AI step.
// Returns { duplicate: true } or { duplicate: false, update }.
export async function recordGithubPush({ project, commit, summary }, db) {
  if (typeof commit?.id !== 'string' || commit.id.length === 0) {
    throw new Error('GitHub push has no commit id')
  }

  const updateId = randomUUID()
  const occurredAt = new Date()
  const commitSha = commit.id.substring(0, SHORT_SHA_LENGTH)

  return db.$transaction(async (tx) => {
    const { created } = await recordActivity(tx, {
      projectId: project.id,
      type: 'GITHUB_PUSH',
      actor: { type: 'INTEGRATION', name: 'GitHub' },
      entityId: updateId,
      externalId: commit.id,
      occurredAt,
      metadata: { commitSha },
    })

    if (!created) return { duplicate: true }

    const update = await tx.update.create({
      data: {
        id: updateId,
        projectId: project.id,
        type: 'AUTO_DEPLOY',
        text: summary,
        commitSha,
        commitUrl: commit.url,
        // Same instant as the event, so the timeline and the update agree.
        createdAt: occurredAt,
      },
    })
    return { duplicate: false, update }
  })
}