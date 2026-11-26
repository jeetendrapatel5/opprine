// lib/billing/paywall.test.js
//
// Pure rule tests always run; the proxy tests need a real Postgres with all
// migrations applied (BILLING_TEST_DATABASE_URL) and wipe User, Workspace
// and Subscription rows. Run with --test-concurrency=1 when it is set.

import test, { before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { isPaywallExemptApi, isBillingPath } from './paywall-rules.js'

test('billing, auth, provider callbacks and public client routes are exempt', () => {
  for (const path of [
    '/api/auth/session',
    '/api/billing/checkout',
    '/api/billing/webhook',
    '/api/cron/billing-reconcile',
    '/api/portal/abc/approve',
    '/api/inquiries',
    '/api/invites/tok/accept',
    '/api/workspace',
    '/api/workspace/switch',
    '/api/projects/p1/inquire',
    '/api/projects/p1/cover-image',
    '/api/webhooks/github/p1',
  ]) {
    assert.equal(isPaywallExemptApi(path), true, path)
  }
})

test('application data routes are not exempt', () => {
  for (const path of [
    '/api/projects',
    '/api/projects/p1',
    '/api/projects/p1/files',
    '/api/tasks',
    '/api/milestones/m1',
    '/api/bank-accounts',
    '/api/workspace/members',
    '/api/workspace/invites',
    '/api/settings',
    '/api/files',
    '/api/billingx',
    '/api/projects/p1/inquire/extra',
  ]) {
    assert.equal(isPaywallExemptApi(path), false, path)
  }
})

test('only the billing page is exempt in the dashboard', () => {
  assert.equal(isBillingPath('/dashboard/settings/billing'), true)
  assert.equal(isBillingPath('/dashboard/settings/billing/anything'), true)
  assert.equal(isBillingPath('/dashboard/settings'), false)
  assert.equal(isBillingPath('/dashboard/settings/billingx'), false)
  assert.equal(isBillingPath('/dashboard'), false)
})

const url = process.env.BILLING_TEST_DATABASE_URL
const opts = { skip: url ? false : 'BILLING_TEST_DATABASE_URL is not set' }
const SECRET = 'test-nextauth-secret-for-paywall'

let prisma
let proxy
let encode
let NextRequest
let userId
let workspaceId

before(async () => {
  if (!url) return
  // Next's package exports omit file extensions, which plain Node ESM
  // cannot resolve; map them the way the bundler does.
  register(
    'data:text/javascript,' +
      encodeURIComponent(
        `export async function resolve(specifier, context, next) {
          if (/^next\\/(server|headers)$/.test(specifier)) return next(specifier + '.js', context)
          return next(specifier, context)
        }`
      )
  )
  process.env.DATABASE_URL = url
  process.env.NEXTAUTH_SECRET = SECRET
  ;({ default: prisma } = await import('../prisma.js'))
  ;({ proxy } = await import('../../proxy.js'))
  ;({ encode } = await import('next-auth/jwt'))
  ;({ NextRequest } = await import('next/server'))
})

after(async () => {
  if (url) await prisma.$disconnect()
})

beforeEach(async () => {
  if (!url) return
  await prisma.subscription.deleteMany()
  await prisma.workspace.deleteMany()
  await prisma.user.deleteMany()
  const user = await prisma.user.create({ data: { name: 'Owner', email: 'owner@example.com', password: 'x' } })
  userId = user.id
  const workspace = await prisma.workspace.create({ data: { name: 'Paywall workspace' } })
  workspaceId = workspace.id
  await prisma.workspaceMember.create({ data: { userId, workspaceId, role: 'OWNER' } })
  await prisma.user.update({ where: { id: userId }, data: { activeWorkspaceId: workspaceId } })
})

async function call(path, { signedIn = true } = {}) {
  const headers = {}
  if (signedIn) {
    const token = await encode({ token: { id: userId, sub: userId }, secret: SECRET })
    headers.cookie = `next-auth.session-token=${token}`
  }
  return proxy(new NextRequest(`http://localhost:3000${path}`, { headers }))
}

const future = () => new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
const past = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)

test('a workspace without a subscription is refused on data routes with 402', opts, async () => {
  const res = await call('/api/projects')
  assert.equal(res.status, 402)
  assert.equal((await res.json()).code, 'SUBSCRIPTION_REQUIRED')
})

test('exempt routes stay reachable while unpaid', opts, async () => {
  for (const path of ['/api/workspace', '/api/billing/checkout', '/api/notifications']) {
    const res = await call(path)
    assert.notEqual(res?.status, 402, path)
  }
})

test('an active paid subscription is let through', opts, async () => {
  await prisma.subscription.create({
    data: { workspaceId, plan: 'PRO', billingCycle: 'MONTHLY', status: 'ACTIVE', razorpaySubscriptionId: 'sub_1', currentPeriodEnd: future() },
  })
  const res = await call('/api/projects')
  assert.notEqual(res?.status, 402)
  assert.notEqual(res?.status, 503)
})

test('pending, expired and lapsed subscriptions are refused', opts, async () => {
  await prisma.subscription.create({
    data: { workspaceId, plan: 'PRO', billingCycle: 'MONTHLY', status: 'PENDING', razorpaySubscriptionId: 'sub_1' },
  })
  assert.equal((await call('/api/projects')).status, 402)

  await prisma.subscription.update({ where: { workspaceId }, data: { status: 'EXPIRED' } })
  assert.equal((await call('/api/projects')).status, 402)

  await prisma.subscription.update({ where: { workspaceId }, data: { status: 'PAST_DUE', currentPeriodEnd: past(8) } })
  assert.equal((await call('/api/projects')).status, 402)

  await prisma.subscription.update({ where: { workspaceId }, data: { status: 'PAST_DUE', currentPeriodEnd: past(2) } })
  assert.notEqual((await call('/api/projects'))?.status, 402)
})

test('a cancelled subscription keeps access only until its paid period ends', opts, async () => {
  await prisma.subscription.create({
    data: { workspaceId, plan: 'TEAM', billingCycle: 'MONTHLY', status: 'CANCELLED', razorpaySubscriptionId: 'sub_1', currentPeriodEnd: future() },
  })
  assert.notEqual((await call('/api/projects'))?.status, 402)
  await prisma.subscription.update({ where: { workspaceId }, data: { currentPeriodEnd: past(1) } })
  assert.equal((await call('/api/projects')).status, 402)
})

test('requests without a session are left to the route to reject', opts, async () => {
  const res = await call('/api/projects', { signedIn: false })
  assert.equal(res, undefined)
})

test('dashboard requests carry the path header for the layout', opts, async () => {
  await prisma.subscription.create({
    data: { workspaceId, plan: 'PRO', billingCycle: 'MONTHLY', status: 'ACTIVE', razorpaySubscriptionId: 'sub_1', currentPeriodEnd: future() },
  })
  const res = await call('/dashboard/projects')
  assert.equal(res.headers.get('x-middleware-request-x-pathname'), '/dashboard/projects')
})
