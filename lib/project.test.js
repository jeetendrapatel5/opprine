// lib/project.test.js
//
// Run with: node --test lib/project.test.js
//
// The fake database tests staffing permissions and task cleanup.
// It does not model transaction rollback.

import { test } from 'node:test'
import assert from 'node:assert/strict'
// The shared Prisma client reads this at import time. Every query uses the fake.
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test'
const { addProjectMember, removeProjectMember } = await import('./project.js')

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
      findUnique: async ({ where, select }) => {
        const project = state.projects.find((p) => p.id === where.id)
        if (!project) return null
        if (!select.workspace) return { workspaceId: project.workspaceId, name: project.name }

        const projectMembership = state.projectMembers.find(
          (member) => member.projectId === project.id && member.userId === select.members.where.userId
        )
        const workspaceMembership = state.workspaceMembers.find(
          (member) => member.workspaceId === project.workspaceId &&
            member.userId === select.workspace.select.members.where.userId
        )
        return {
          members: projectMembership ? [{ role: projectMembership.role }] : [],
          workspace: { members: workspaceMembership ? [{ role: workspaceMembership.role }] : [] },
        }
      },
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
          if (t.assignedToId === where.assignedToId && t.milestone.projectId === where.milestone.projectId) {
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
    { name: 'ForbiddenError', message: /you do not have permission to manage staffing/i }
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
    { name: 'ForbiddenError', message: /the only Project Manager/i }
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
    { name: 'ForbiddenError', message: /the only Project Manager/i }
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
    tasks: [
      { id: 'task_1', assignedToId: 'user_pm_a', milestone: { projectId: 'proj_1' } },
      { id: 'task_2', assignedToId: 'user_pm_a', milestone: { projectId: 'proj_2' } },
    ],
  })

  const result = await removeProjectMember(
    { requestingUserId: 'user_pm_b', targetUserId: 'user_pm_a', projectId: 'proj_1' },
    db
  )

  assert.deepEqual(result, { removed: true, userId: 'user_pm_a', projectId: 'proj_1' })
  assert.deepEqual(db._state.projectMembers.map((member) => member.id), ['pm_2'])
  assert.deepEqual(db._state.tasks.map((task) => task.assignedToId), [null, 'user_pm_a'])
})
