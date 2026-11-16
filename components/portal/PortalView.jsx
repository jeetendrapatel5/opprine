// components/portal/PortalView.jsx
// Page layout for the client portal: header, overview, anything waiting on the
// client, then timeline and updates (main column) beside team, invoices, files
// and sign-off (side column). Pure presentation: app/portal/[token]/page.jsx
// fetches the data and passes it in. Server Component.

import { Mail } from 'lucide-react'

import PortalHeader from './PortalHeader'
import ProgressBanner from './ProgressBanner'
import CurrentlyWorkingOn from './CurrentlyWorkingOn'
import ActionPanel from './ActionPanel'
import ClientRequests from './ClientRequests'
import ProjectMilestones from './ProjectMilestones'
import UpdateFeed from './UpdateFeed'
import ProjectTeam from './ProjectTeam'
import InvoicePanel from './InvoicePanel'
import FileDeliverables from './FileDeliverables'
import ProjectSignOff from './ProjectSignOff'
import { Button, Card } from './ui'

// Section links for the header. "Action needed" points at the most direct place
// to act: legacy update approvals, then open requests, then milestones in review.
function buildNavItems({ milestones, project, requests, actionItems }) {
  const openRequests = requests.filter((r) => r.status === 'OPEN').length
  const milestonesInReview = milestones.filter((m) => m.status === 'IN_REVIEW').length
  const actionCount = actionItems.length + openRequests + milestonesInReview
  const actionTarget = actionItems.length ? 'review' : openRequests ? 'requests' : 'timeline'
  const hasInvoices = project.invoices.some((inv) => inv.status !== 'CANCELLED')

  return [
    { id: 'overview', label: 'Overview' },
    actionCount > 0 && { id: actionTarget, label: 'Action needed', badge: actionCount },
    milestones.length > 0 && { id: 'timeline', label: 'Timeline' },
    { id: 'updates', label: 'Updates' },
    { id: 'files', label: 'Files' },
    hasInvoices && { id: 'invoices', label: 'Invoices' },
  ].filter(Boolean)
}

function ContactCard({ name, email }) {
  return (
    <Card as="section" aria-labelledby="contact-title" className="p-5 sm:p-6">
      <h2 id="contact-title" className="text-base font-semibold text-fp-portal-text-primary">
        Have a question?
      </h2>
      <p className="mt-1 text-sm text-fp-portal-text-secondary">Reach out to {name} directly.</p>
      <Button href={`mailto:${email}`} icon={Mail} className="mt-4 w-full">
        Send a message
      </Button>
    </Card>
  )
}

export default function PortalView({
  token,
  client,
  project,
  milestones,
  progress,
  teamMembers,
  requestData,
  actionItems,
}) {
  const freelancerName = project.user.name || 'Your developer'
  const navItems = buildNavItems({ milestones, project, requests: requestData.requests, actionItems })

  return (
    <div className="min-h-screen bg-fp-portal-bg font-body text-fp-portal-text-primary">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-fp-portal-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-fp-pop"
      >
        Skip to content
      </a>

      <PortalHeader freelancerName={freelancerName} freelancerEmail={project.user.email} navItems={navItems} />

      <main id="main" className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <ProgressBanner
          progress={progress}
          projectName={project.name}
          clientName={client.name}
          milestones={milestones}
        />

        {progress.projectStatus === 'ON_TRACK' && progress.currentMilestone && (
          <CurrentlyWorkingOn milestone={progress.currentMilestone} />
        )}

        {/* Each of these renders nothing when there is nothing for the client to do. */}
        <ActionPanel items={actionItems} token={token} />
        <ClientRequests requests={requestData.requests} blocked={requestData.blocked} token={token} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <ProjectMilestones milestones={milestones} token={token} />
            <UpdateFeed updates={project.updates} />
          </div>

          <aside aria-label="Project details" className="space-y-6 lg:col-span-4">
            <ProjectTeam members={teamMembers} />
            <InvoicePanel invoices={project.invoices} />
            <FileDeliverables files={project.files} />
            <ProjectSignOff
              projectId={project.id}
              freelancerName={freelancerName}
              existingRating={project.clientRating}
              existingTestimonial={project.testimonial}
            />
            <ContactCard name={freelancerName} email={project.user.email} />
          </aside>
        </div>
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-2 text-center text-xs text-fp-portal-text-muted sm:px-6 lg:px-8">
        This private link was created for {client.name}. Please don&apos;t share it.
      </footer>
    </div>
  )
}
