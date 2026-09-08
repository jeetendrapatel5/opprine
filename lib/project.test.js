// lib/project.test.js
//
// Run with: node --test lib/project.test.js
// (Node's built-in test runner — no new dependency needed for this.)
//
// This tests the two behaviors your brief explicitly called out as
// needing a real test, not just manual spot-checking:
//   1. Privilege escalation is closed — a CONTRIBUTOR calling
//      addProjectMember to self-promote fails.
//   2. "Last PM standing" — removing/demoting the only PROJECT_MANAGER
//      on a project is blocked.
//
// HOW THE FAKE DB WORKS
// ----------------------
// addProjectMember/removeProjectMember both accept `db = prisma` as
// their last argument (dependency injection, already the pattern this
// codebase uses everywhere). That's what makes this possible without
// touching a real database: tests just pass in a small in-memory
// object shaped like the handful of Prisma calls these two functions
// actually make.
//
// LIMITATION, on purpose: this fake db does NOT implement real
// transaction atomicity — its $transaction just runs each operation
// and collects the results. That's fine here, because these tests are
// checking PERMISSION LOGIC and DATA EFFECTS (was the row deleted,
// was assignedToId nulled out), not "does Postgres roll back
// correctly if the second query fails." That second thing can only be
// verified against a real Postgres instance, not a unit test.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addProjectMember, removeProjectMember } from './project.js'

// A minimal in-memory stand-in for the Prisma client. Only implements
// exactly the calls project.js's addProjectMember/removeProjectMember
// make — it is NOT a general Prisma mock.
function createFakeDb({ projectMembers = [], workspaceMembers = [], projects = [], tasks = [] }) {
  const state = {
    projectMembers: [...projectMembers],
    workspaceMembers: [...workspaceMembers],
    projects: [...projects],
    tasks: [...tasks],
  }

  return {
    project: {
      findUnique: async ({ where }) => state.projects.find((p) => p.id === where.id) ?? null,
    },
    workspaceMember: {
      findFirst: async ({ where }) =>
        state.workspaceMembers.find(
          (m) => m.userId === where.userId && m.workspaceId === where.workspaceId
        ) ?? null,
    },
    projectMember: {
      findFirst: async ({ where }) =>
        state.projectMembers.find(
          (m) => m.userId === where.userId && m.projectId === where.projectId
        ) ?? null,
      count: async ({ where }) =>
        state.projectMembers.filter((m) => {
          if (m.projectId !== where.projectId) return false
          if (where.role && m.role !== where.role) return false
          if (where.userId?.not && m.userId === where.userId.not) return false
          return true
        }).length,
      upsert: async ({ where, update, create }) => {
        const existing = state.projectMembers.find(
          (m) =>
            m.projectId === where.projectId_userId.projectId &&
            m.userId === where.projectId_userId.userId
        )
        if (existing) {
          Object.assign(existing, update)
          return existing
        }
        const created = { id: `pm_${state.projectMembers.length + 1}`, ...create }
        state.projectMembers.push(created)
        return created
      },
      delete: async ({ where }) => {
        const idx = state.projectMembers.findIndex((m) => m.id === where.id)
        const [removed] = state.projectMembers.splice(idx, 1)
        return removed
      },
    },
    task: {
      updateMany: async ({ where, data }) => {
        let count = 0
        for (const t of state.tasks) {
          if (t.assignedToId === where.assignedToId) {
            Object.assign(t, data)
            count++
          }
        }
        return { count }
      },
    },
    $transaction: async (ops) => Promise.all(ops),
    _state: state, // exposed so tests can assert on final state directly
  }
}

test('privilege escalation: a CONTRIBUTOR cannot self-promote via addProjectMember', async () => {
  const db = createFakeDb({
    projects: [{ id: 'proj_1', workspaceId: 'ws_1' }],
    workspaceMembers: [{ userId: 'user_contributor', workspaceId: 'ws_1', role: 'MEMBER' }],
    projectMembers: [{ id: 'pm_1', projectId: 'proj_1', userId: 'user_contributor', role: 'CONTRIBUTOR' }],
  })

  await assert.rejects(
    () =>
      addProjectMember(
        {
          requestingUserId: 'user_contributor',
          targetUserId: 'user_contributor',
          projectId: 'proj_1',
          role: 'PROJECT_MANAGER',
        },
        db
      ),
    (err) => {
      assert.equal(err.name, 'ForbiddenError')
      return true
    }
  )
})

test('last PM standing: cannot remove the only PROJECT_MANAGER on a project', async () => {
  const db = createFakeDb({
    projects: [{ id: 'proj_1', workspaceId: 'ws_1' }],
    workspaceMembers: [{ userId: 'user_pm', workspaceId: 'ws_1', role: 'MEMBER' }],
    projectMembers: [{ id: 'pm_1', projectId: 'proj_1', userId: 'user_pm', role: 'PROJECT_MANAGER' }],
  })

  await assert.rejects(
    () =>
      removeProjectMember(
        { requestingUserId: 'user_pm', targetUserId: 'user_pm', projectId: 'proj_1' },
        db
      ),
    (err) => {
      assert.equal(err.name, 'ForbiddenError')
      return true
    }
  )
})

test('last PM standing: cannot demote the only PROJECT_MANAGER via addProjectMember', async () => {
  const db = createFakeDb({
    projects: [{ id: 'proj_1', workspaceId: 'ws_1' }],
    workspaceMembers: [{ userId: 'user_pm', workspaceId: 'ws_1', role: 'MEMBER' }],
    projectMembers: [{ id: 'pm_1', projectId: 'proj_1', userId: 'user_pm', role: 'PROJECT_MANAGER' }],
  })

  await assert.rejects(
    () =>
      addProjectMember(
        { requestingUserId: 'user_pm', targetUserId: 'user_pm', projectId: 'proj_1', role: 'CONTRIBUTOR' },
        db
      ),
    (err) => {
      assert.equal(err.name, 'ForbiddenError')
      return true
    }
  )
})

test('removing a non-last PM succeeds, and nulls out their task assignments on that project', async () => {
  const db = createFakeDb({
    projects: [{ id: 'proj_1', workspaceId: 'ws_1' }],
    workspaceMembers: [
      { userId: 'user_pm_a', workspaceId: 'ws_1', role: 'MEMBER' },
      { userId: 'user_pm_b', workspaceId: 'ws_1', role: 'MEMBER' },
    ],
    projectMembers: [
      { id: 'pm_1', projectId: 'proj_1', userId: 'user_pm_a', role: 'PROJECT_MANAGER' },
      { id: 'pm_2', projectId: 'proj_1', userId: 'user_pm_b', role: 'PROJECT_MANAGER' },
    ],
    tasks: [{ id: 'task_1', assignedToId: 'user_pm_a' }],
  })

  const result = await removeProjectMember(
    { requestingUserId: 'user_pm_b', targetUserId: 'user_pm_a', projectId: 'proj_1' },
    db
  )

  assert.equal(result.removed, true)
  assert.equal(db._state.projectMembers.length, 1) // pm_1 gone, pm_2 remains
  assert.equal(db._state.tasks[0].assignedToId, null) // cleaned up
})

// NOTE: this file doesn't yet test requireProjectMembership's implicit
// OWNER/ADMIN fallback directly, or can()/canDeleteTask from
// lib/project-permissions.js in isolation. Worth adding once you're
// ready — the fake db above already has everything those tests would
// need (just add a workspaceMember row with role 'OWNER' and no
// matching projectMember row).