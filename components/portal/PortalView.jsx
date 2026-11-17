// components/portal/PortalView.jsx
// Composes the portal into five screens (overview, timeline, requests, files,
// invoices) and hands them to PortalShell, which owns navigation. Pure
// presentation: app/portal/[token]/page.jsx fetches the data and passes it in.
// Server Component.

import { ClipboardList, ListChecks } from 'lucide-react'

import PortalShell from './PortalShell'
import AttentionCard from './AttentionCard'
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
import { Card, CardBody, EmptyState } from './ui'
import { plural } from '@/components/dashboard/requests/request-format'
import { PROJECT_STATUS } from '@/lib/portal-format'

// Items for the overview's "Needs your attention" list. Legacy update sign-offs
// (actionItems) render as ActionPanel on the overview itself, so they are not repeated.
function buildAttention({ milestones, requests, invoices }) {
  const items = []

  const inReview = milestones.filter((m) => m.status === 'IN_REVIEW')
  if (inReview.length) {
    items.push({
      id: 'review',
      view: 'timeline',
      icon: 'review',
      label: `${plural(inReview.length, 'milestone')} ready for your sign-off`,
      detail: inReview.map((m) => m.title).join(', '),
    })
  }

  const open = requests.filter((r) => r.status === 'OPEN')
  if (open.length) {
    items.push({
      id: 'requests',
      view: 'requests',
      icon: 'request',
      label: `${plural(open.length, 'request')} need${open.length === 1 ? 's' : ''} your input`,
      detail: open[0].title,
    })
  }

  const unpaid = invoices.filter((inv) => inv.status === 'UNPAID')
  if (unpaid.length) {
    const overdue = unpaid.some((inv) => inv.dueDate && new Date(inv.dueDate) < new Date())
    items.push({
      id: 'invoices',
      view: 'invoices',
      icon: 'invoice',
      label: `${plural(unpaid.length, 'unpaid invoice')}`,
      detail: overdue ? 'At least one is overdue' : 'Pay securely with Stripe',
      tone: overdue ? 'danger' : 'accent',
    })
  }

  return items
}

function ScreenEmpty({ icon, title, description }) {
  return (
    <Card>
      <CardBody>
        <EmptyState icon={icon} title={title} description={description} />
      </CardBody>
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
  const requests = requestData.requests
  const invoices = project.invoices.filter((inv) => inv.status !== 'CANCELLED')
  const attention = buildAttention({ milestones, requests, invoices })
  const status = PROJECT_STATUS[progress.projectStatus] ?? PROJECT_STATUS.ON_TRACK

  const count = (id) => attention.some((a) => a.id === id)
  const inReview = milestones.filter((m) => m.status === 'IN_REVIEW').length
  const openRequests = requests.filter((r) => r.status === 'OPEN').length
  const unpaid = invoices.filter((inv) => inv.status === 'UNPAID').length

  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      badge: actionItems.length,
      title: 'Overview',
      description: `Where ${project.name} stands today.`,
    },
    {
      id: 'timeline',
      label: 'Timeline',
      badge: count('review') ? inReview : 0,
      title: 'Project timeline',
      description: 'Every milestone, delivery and approval in one place.',
    },
    {
      id: 'requests',
      label: 'Requests',
      badge: openRequests,
      title: 'Requests',
      description: `Things ${freelancerName} needs from you to keep moving.`,
    },
    { id: 'files', label: 'Files', badge: 0, title: 'Files', description: 'Deliverables shared with you.' },
    {
      id: 'invoices',
      label: 'Invoices',
      badge: unpaid,
      title: 'Invoices',
      description: 'Your invoices and payment status.',
    },
  ]

  const views = {
    overview: (
      <div className="space-y-6">
        <ProgressBanner progress={progress} projectName={project.name} clientName={client.name} milestones={milestones} />
        {progress.projectStatus === 'ON_TRACK' && progress.currentMilestone && (
          <CurrentlyWorkingOn milestone={progress.currentMilestone} />
        )}
        <ActionPanel items={actionItems} token={token} />
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <AttentionCard items={attention} />
            <UpdateFeed updates={project.updates} />
          </div>
          <div className="space-y-6 lg:col-span-2">
            <ProjectTeam members={teamMembers} />
            <ProjectSignOff
              projectId={project.id}
              freelancerName={freelancerName}
              existingRating={project.clientRating}
              existingTestimonial={project.testimonial}
            />
          </div>
        </div>
      </div>
    ),
    timeline:
      milestones.length > 0 ? (
        <ProjectMilestones milestones={milestones} token={token} />
      ) : (
        <ScreenEmpty icon={ListChecks} title="No milestones yet" description="The project plan is being set up." />
      ),
    requests:
      requests.length > 0 ? (
        <ClientRequests requests={requests} blocked={requestData.blocked} token={token} />
      ) : (
        <ScreenEmpty icon={ClipboardList} title="Nothing needed from you" description="Requests from your developer will show up here." />
      ),
    files: <FileDeliverables files={project.files} />,
    invoices: <InvoicePanel invoices={project.invoices} />,
  }

  return (
    <PortalShell
      navItems={navItems}
      views={views}
      identity={{ freelancerName, freelancerEmail: project.user.email, clientName: client.name }}
      project={{
        name: project.name,
        percentage: progress.percentage,
        statusLabel: status.label,
        statusTone: status.tone,
      }}
    />
  )
}
