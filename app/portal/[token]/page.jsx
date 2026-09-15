// app/portal/[token]/page.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PSYCHOLOGICAL GOAL: The client opens this page and within 5 seconds thinks:
// "My project is real, it's moving forward, and this person is a professional."
//
// LAYOUT (vertical, then 2-column):
//   Full-width: ProgressBanner — immediate reassurance ("work is happening")
//   Full-width: CurrentlyWorkingOn — what's being built RIGHT NOW
//   Full-width: ActionPanel — if a milestone needs approval (most important CTA)
//   Left 2/3:  ProjectMilestones (timeline) + UpdateFeed (work log)
//   Right 1/3: ProjectTeam + InvoicePanel + FileDeliverables + ProjectSignOff
//
// HIERARCHY:
//   1. Progress bar + project name (trust signal — scored immediately)
//   2. Action items (if approval is needed — give client one job)
//   3. Timeline (where are we? where are we going?)
//   4. Team identity (who is doing this work? — was a single
//      "Your Developer" card, now every ProjectMember, since a real
//      project is usually staffed by more than one person)
//   5. Everything else (invoices, files, sign-off)
//
// Server Component — data fetched here, passed down as props.
// Client-side interactions (approval, sign-off) are in child Client Components.
// ─────────────────────────────────────────────────────────────────────────────

import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getProjectProgress } from '@/lib/projectProgress'
import { listProjectMembersForPortal } from '@/lib/project'

import ProgressBanner      from '@/components/portal/ProgressBanner'
import CurrentlyWorkingOn  from '@/components/portal/CurrentlyWorkingOn'
import ActionPanel         from '@/components/portal/ActionPanel'
import ProjectMilestones   from '@/components/portal/ProjectMilestones'
import UpdateFeed          from '@/components/portal/UpdateFeed'
import ProjectTeam         from '@/components/portal/ProjectTeam'
import InvoicePanel        from '@/components/portal/InvoicePanel'
import FileDeliverables    from '@/components/portal/FileDeliverables'
import ProjectSignOff      from '@/components/portal/ProjectSignOff'
import { Mail }            from 'lucide-react'

export default async function PortalPage({ params }) {
  const { token } = await params

  const client = await prisma.client.findUnique({
    where: { magicToken: token },
    include: {
      project: {
        include: {
          // Only name + email are used anywhere below now — bio,
          // avatarUrl, and portfolioUrl existed solely to feed the old
          // FreelancerCard, which ProjectTeam replaces. Trimmed the
          // select rather than leave them riding along unused, same
          // "don't fetch what nothing reads" reasoning as the
          // createdByUserId strip on milestones further down.
          user: {
            select: {
              name:  true,
              email: true,
            },
          },
          updates:  { orderBy: { createdAt: 'desc' }, take: 10 },
          files:    { orderBy: { createdAt: 'desc' } },
          milestones: {
            orderBy: { order: 'asc' },
            include: {
              milestoneUpdates: { orderBy: { createdAt: 'asc' } },
              messages:         { orderBy: { createdAt: 'asc' } },
            },
          },
          invoices: {
            orderBy: { createdAt: 'desc' },
            include: {
              milestone: { select: { title: true } },
            },
          },
        },
      },
    },
  })

  if (!client) notFound()

  // Fire-and-forget — record when the client opened the portal.
  // .catch() prevents an unhandled rejection if this fails.
  prisma.client.update({
    where: { magicToken: token },
    data:  { lastViewedAt: new Date() },
  }).catch(() => {})

  const { project } = client

  // Everyone staffed on this project, shaped for client eyes (no
  // email, no workspace role, no permission metadata) — see
  // listProjectMembersForPortal in lib/project.js. Scoped to this
  // project only, via the projectId we already resolved above from a
  // valid magic token, so this can never surface another project's or
  // another workspace's people.
  const teamMembers = await listProjectMembersForPortal(project.id)

  // Strip createdByUserId from every milestone before it goes anywhere
  // downstream. It's a new scalar field (added alongside ProjectMember/
  // Task) that the `include` above pulls in by default along with
  // every other Milestone column — include returns all scalars PLUS
  // whatever relations are explicitly named, unlike select. Left as-is,
  // it would ride along inside project.milestones straight into
  // ProgressBanner and ProjectMilestones as props below, landing in
  // the rendered page for anyone holding the magic link, whether or
  // not either component actually displays it. Stripped once here
  // rather than at each of the two call sites.
  //
  // tasks is NOT part of this — it's a relation, and Prisma never
  // includes a relation unless it's named inside `include`, which it
  // isn't above. That's the actual thing this file was checked for,
  // and it's clean.
  const safeMilestones = project.milestones.map(({ createdByUserId, ...milestone }) => milestone)

  const progress = getProjectProgress(safeMilestones)

  // Update-level action items (legacy Update model, not milestones)
  const actionItems = project.updates.filter(u => u.status === 'IN_REVIEW')

  return (
    // Portal world: warm paper-white background, generous padding
    <div className="min-h-screen bg-fp-portal-surface font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">

        {/* ── Zone 1: Progress banner ── */}
        {/* First thing the client sees. Contains the project name, progress bar,
            milestone count. Answers "is work happening?" in 2 seconds. */}
        <ProgressBanner
          progress={progress}
          projectName={project.name}
          clientName={client.name}
          milestones={safeMilestones}
        />

        {/* ── Zone 2: Currently working on ── */}
        {/* Only shown when there is an IN_PROGRESS milestone.
            Tells the client exactly what is being built right now. */}
        {progress.projectStatus === 'ON_TRACK' && progress.currentMilestone && (
          <CurrentlyWorkingOn milestone={progress.currentMilestone} />
        )}

        {/* ── Zone 3: Action panel ── */}
        {/* Only shown when there are Update-level items needing approval.
            Milestone-level approvals live inside ProjectMilestones → DeliveryCard. */}
        <ActionPanel items={actionItems} token={token} />

        {/* ── Zone 4: Main 2-column grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">

          {/* LEFT — Timeline + Work log */}
          <div className="lg:col-span-8 space-y-6">

            <section>
              <SectionLabel>Project Timeline</SectionLabel>
              <ProjectMilestones
                milestones={safeMilestones}
                freelancerName={project.user.name}
                clientName={client.name}
                token={token}
              />
            </section>

            <section>
              <SectionLabel>Recent Updates</SectionLabel>
              <UpdateFeed updates={project.updates} />
            </section>

          </div>

          {/* RIGHT — Team, Invoices, Files, Sign-off */}
          <div className="lg:col-span-4 space-y-5">

            {/* Who is doing this work? — always first on the right.
                Renders nothing if the project has no ProjectMember rows
                yet (see the early return in ProjectTeam). */}
            <ProjectTeam members={teamMembers} />

            {/* Invoices — time-sensitive, shown before files */}
            <InvoicePanel invoices={project.invoices} />

            {/* Files */}
            <section>
              <SectionLabel>Deliverables</SectionLabel>
              <FileDeliverables files={project.files} />
            </section>

            {/* Sign-off form — only when project is near completion */}
            <ProjectSignOff
              projectId={project.id}
              freelancerName={project.user.name}
              existingRating={project.clientRating}
              existingTestimonial={project.testimonial}
            />

            {/* Contact card — always at the bottom of the right column */}
            <div className="bg-fp-portal-surface border border-fp-portal-border rounded-xl p-5">
              <p className="text-fp-portal-text-primary text-sm font-semibold mb-1">
                Have a question?
              </p>
              <p className="text-fp-portal-text-secondary text-xs leading-relaxed mb-4">
                Reach out to {project.user.name} directly.
              </p>
              <a
                href={`mailto:${project.user.email}`}
                className="
                  flex items-center justify-center gap-2
                  bg-fp-portal-raised border border-fp-portal-border
                  text-fp-portal-text-primary text-sm font-medium
                  py-2.5 px-4 rounded-lg
                  hover:border-fp-portal-accent/40 hover:text-fp-portal-accent
                  transition-colors duration-150
                "
              >
                <Mail className="w-4 h-4" />
                Send a Message
              </a>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

// Small section label — consistent across all portal sections
// This is a pure display component local to this file (no need for a file)
function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold text-fp-portal-text-tertiary uppercase tracking-widest mb-3 px-1">
      {children}
    </p>
  )
}