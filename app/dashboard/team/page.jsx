// app/dashboard/team/page.jsx
//
// FLAGGED ASSUMPTION: I put this at app/dashboard/team/page.jsx —
// a guess at the route, since nothing told me the real one (could just
// as easily be app/dashboard/settings/team/page.jsx). Move the file if
// that's wrong; nothing else in this page depends on its own path.
//
// Server Component. Fetches everything through the SAME lib functions
// the API routes use (requireWorkspaceMembership, listWorkspaceMembers,
// listInvites) — called directly here, not through a self-fetch to our
// own API. A Server Component calling server-side lib code directly is
// the normal Next.js App Router pattern (see how page.jsx for a single
// project queries prisma directly, not through an API route); the API
// routes exist for the CLIENT COMPONENTS below (the invite form, the
// revoke button) to call from the browser, where direct DB access
// isn't possible.

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { requireWorkspaceMembership, listWorkspaceMembers } from '@/lib/workspace'
import { listInvites, listReceivedInvites } from '@/lib/invites'

import { SectionHeader, PanelCard } from '@/components/dashboard/panel-ui'
import InviteMemberForm from '@/components/dashboard/team/InviteMemberForm'
import PendingInvitesList from '@/components/dashboard/team/PendingInvitesList'
import MembersList from '@/components/dashboard/team/MembersList'
import ReceivedInvitesList from '@/components/dashboard/team/ReceivedInvitesList'

export default async function TeamPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/signin')

  // Throws NotFoundError (→ redirect/error boundary, depending on how
  // your error handling is wired for Server Components) if this user
  // somehow has no workspace — same function every other workspace-
  // aware route already relies on.
  const membership = await requireWorkspaceMembership(session.user.id)
  const canManageTeam = membership.role === 'OWNER' || membership.role === 'ADMIN'

  const [members, invites, receivedInvites] = await Promise.all([
    listWorkspaceMembers(membership.workspaceId),
    listInvites(membership.workspaceId),
    // Not scoped to membership.workspaceId at all — this is "invites
    // sent to ME," which can span workspaces I'm not even a member of
    // yet. session.user.email, never anything client-supplied — see
    // the security note on listReceivedInvites in lib/invites.js.
    listReceivedInvites(session.user.email),
  ])

  return (
    <div className="pb-24">
      {/* ── PAGE HEADER ── */}
      <div className="mb-8">
        <h1 className="text-xl sm:text-3xl font-semibold text-fp-text-primary tracking-tight leading-tight">
          Team
        </h1>
        <p className="text-fp-text-tertiary text-sm mt-1.5 max-w-2xl leading-relaxed">
          {members.length} {members.length === 1 ? 'person has' : 'people have'} access to{' '}
          {membership.workspace.name}.
        </p>
      </div>

      {/* Full-width, above the grid on purpose — this is about the
          VIEWING USER, not the workspace being managed below, so it
          reads as a distinct notification rather than a third column
          competing with Members/Pending invites. Renders nothing when
          empty (see the component). */}
      <ReceivedInvitesList initialInvites={receivedInvites} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* MAIN — member list. SectionHeader + plain bordered container,
            matching how Milestones/Activity are done in the main column
            of the project page (as opposed to PanelCard, which is the
            aside-panel convention — see below). */}
        <div className="lg:col-span-8 space-y-8">
          <section id="members" className="scroll-mt-24">
            <SectionHeader title="Members" badge={`${members.length}`} />
            <MembersList
              initialMembers={members}
              currentUserId={session.user.id}
              currentUserRole={membership.role}
            />
          </section>
        </div>

        {/* ASIDE — invite form + pending invites. PanelCard, matching
            the Client Panel / Project Details Panel convention in the
            project page's aside. */}
        <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
          {canManageTeam && (
            <PanelCard label="Invite a teammate">
              <div className="px-4 py-4">
                <InviteMemberForm />
              </div>
            </PanelCard>
          )}

          <PanelCard label="Pending invites">
            <PendingInvitesList initialInvites={invites} canManage={canManageTeam} />
          </PanelCard>
        </aside>
      </div>
    </div>
  )
}