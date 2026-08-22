import { getServerSession } from 'next-auth'
import { authOptions }       from '@/lib/auth'
import { redirect }          from 'next/navigation'
import prisma                from '@/lib/prisma'
import StatsCard             from '@/components/StatsCard'
import ClientsView           from '@/components/ClientsView'
import { requireWorkspaceMembership } from '@/lib/workspace'

export default async function ClientsPage() {

  const session = await getServerSession(authOptions)
  if (!session) redirect('/signin')

  const membership = await requireWorkspaceMembership(session.user.id)

  const clients = await prisma.client.findMany({
    where: {
      project: { workspaceId: membership.workspaceId },
    },
    include: {
      project: {
        select: {
          id:         true,
          name:       true,
          status:     true,
          createdAt:  true,
          invoices: {
            select: { amount: true, status: true, currency: true },
          },
          milestones: {
            select: { status: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const serialized = clients.map(c => ({
    ...c,
    createdAt:    c.createdAt.toISOString(),
    lastViewedAt: c.lastViewedAt?.toISOString() ?? null,
    project: {
      ...c.project,
      createdAt: c.project.createdAt.toISOString(),
    },
  }))

  const totalClients  = clients.length
  const activeClients = clients.filter(c => c.project.status === 'ACTIVE').length

  const totalBilled = clients.reduce((sum, c) =>
    sum + c.project.invoices
      .filter(i => i.status === 'PAID')
      .reduce((s, i) => s + i.amount, 0),
  0)

  const pendingRevenue = clients.reduce((sum, c) =>
    sum + c.project.invoices
      .filter(i => i.status === 'UNPAID')
      .reduce((s, i) => s + i.amount, 0),
  0)

  const subtitle =
    totalClients === 0
      ? 'Your client roster lives here. Create a project to add your first client.'
      : `${activeClients} active · ${totalClients} total`

  const billedDisplay = totalBilled > 0
    ? `$${Math.round(totalBilled).toLocaleString()}`
    : 0

  return (
    <div>
      <ClientsView
        clients={serialized}
        pendingRevenue={pendingRevenue}
      />
    </div>
  )
}