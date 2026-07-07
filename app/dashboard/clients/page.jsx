import { getServerSession } from 'next-auth'
import { authOptions }       from '@/lib/auth'
import { redirect }          from 'next/navigation'
import prisma                from '@/lib/prisma'
import StatsCard             from '@/components/StatsCard'
import ClientsView           from '@/components/ClientsView'

export default async function ClientsPage() {

  // ── Auth ──────────────────────────────────────────────────────────────────
  // layout.jsx already checks this, but we check again here so TypeScript
  // knows session is non-null for the rest of the function.
  const session = await getServerSession(authOptions)
  if (!session) redirect('/signin')

  // ── Data ──────────────────────────────────────────────────────────────────
  // Important schema note: Client is 1-to-1 with Project (projectId @unique).
  // There is no standalone "client" record — a client is always tied to a
  // specific project. So we query clients scoped to this user's projects,
  // then include the project's invoices and milestones for display + stats.
  const clients = await prisma.client.findMany({
    where: {
      project: { userId: session.user.id },
    },
    include: {
      project: {
        select: {
          id:         true,
          name:       true,
          status:     true,
          createdAt:  true,
          // Invoices — we need amount + status to compute paid/pending totals
          invoices: {
            select: { amount: true, status: true, currency: true },
          },
          // Milestones — just statuses so we can show progress in the table
          milestones: {
            select: { status: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // ── Serialize dates ───────────────────────────────────────────────────────
  // Next.js App Router cannot pass Date objects from server → client components.
  // We must convert them to ISO strings, then parse them back in the client
  // component when needed for relative time calculations.
  const serialized = clients.map(c => ({
    ...c,
    createdAt:    c.createdAt.toISOString(),
    lastViewedAt: c.lastViewedAt?.toISOString() ?? null,    // nullable
    project: {
      ...c.project,
      createdAt: c.project.createdAt.toISOString(),
    },
  }))

  // ── Page-level stats ──────────────────────────────────────────────────────
  // These are computed server-side because they live above <ClientsView>
  // in the render tree (StatsCards are not interactive).

  const totalClients  = clients.length
  const activeClients = clients.filter(c => c.project.status === 'ACTIVE').length

  // Sum all PAID invoices across all client projects
  const totalBilled = clients.reduce((sum, c) =>
    sum + c.project.invoices
      .filter(i => i.status === 'PAID')
      .reduce((s, i) => s + i.amount, 0),
  0)

  // Sum all UNPAID invoices — surfaced as a banner inside <ClientsView>
  const pendingRevenue = clients.reduce((sum, c) =>
    sum + c.project.invoices
      .filter(i => i.status === 'UNPAID')
      .reduce((s, i) => s + i.amount, 0),
  0)

  // ── Dynamic subtitle ──────────────────────────────────────────────────────
  const subtitle =
    totalClients === 0
      ? 'Your client roster lives here. Create a project to add your first client.'
      : `${activeClients} active · ${totalClients} total`

  // Format billed amount for StatsCard — StatsCard renders value as-is,
  // so we pass a formatted string when there's a value, or 0 otherwise.
  const billedDisplay = totalBilled > 0
    ? `$${Math.round(totalBilled).toLocaleString()}`
    : 0

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>

      <ClientsView
        clients={serialized}
        pendingRevenue={pendingRevenue}
      />

    </div>
  )
}