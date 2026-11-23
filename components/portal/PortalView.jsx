// components/portal/PortalView.jsx
// Composes the portal into five screens (overview, timeline, requests, files,
// invoices) and hands them to PortalShell, which owns navigation. Pure
// presentation: app/portal/[token]/page.jsx fetches the data and passes it in.
// Server Component.

import { ClipboardList, ListChecks } from 'lucide-react'

import PortalShell from './PortalShell'
import AttentionCard from './AttentionCard'
import MetricStrip from './MetricStrip'
import NextAction from './NextAction'
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
import { formatDate, plural } from '@/components/dashboard/requests/request-format'
import {
  PROJECT_STATUS,
  dueLabel,
  getActivityBuckets,
  getNextDueMilestone,
  summarizeInvoices,
  timeAgo,
} from '@/lib/portal-format'

// The most urgent due label among items that have a due date, or null.
function mostUrgentDue(dates, now) {
  const labels = dates.filter(Boolean).map((d) => dueLabel(d, now))
  return labels.length ? labels.reduce((a, b) => (b.days < a.days ? b : a)) : null
}

// Everything the overview derives from data the page already fetched.
// Lives outside the component so the clock read stays out of render.
function buildOverview({ milestones, requests, project, actionItems }) {
  const now = Date.now()

  // Things waiting on the client, most urgent first: a sign-off blocks the
  // project, then overdue money, then open requests, then other unpaid invoices.
  const items = []

  if (actionItems.length) {
    items.push({
      id: 'legacy', priority: 0, view: 'overview', anchor: 'review-panel', action: 'Review', cta: 'Review sign-off',
      label: `${plural(actionItems.length, 'update')} awaiting your sign-off`,
      detail: actionItems[0].text,
    })
  }

  const inReview = milestones.filter((m) => m.status === 'IN_REVIEW')
  if (inReview.length) {
    items.push({
      id: 'review', priority: 1, view: 'timeline', action: 'Review', cta: 'Review sign-off',
      label: `${plural(inReview.length, 'milestone')} ready for your sign-off`,
      detail: inReview.map((m) => m.title).join(', '),
      meta: mostUrgentDue(inReview.map((m) => m.dueDate), now),
    })
  }

  const open = requests.filter((r) => r.status === 'OPEN')
  if (open.length) {
    items.push({
      id: 'requests', priority: 3, view: 'requests', action: 'Answer', cta: 'Answer requests',
      label: `${plural(open.length, 'request')} need${open.length === 1 ? 's' : ''} your input`,
      detail: open[0].title,
      meta: mostUrgentDue(open.map((r) => r.dueDate), now),
    })
  }

  const unpaid = project.invoices.filter((inv) => inv.status === 'UNPAID')
  if (unpaid.length) {
    const overdue = unpaid.some((inv) => inv.dueDate && new Date(inv.dueDate).getTime() < now)
    items.push({
      id: 'invoices', priority: overdue ? 2 : 4, view: 'invoices', action: 'Pay', cta: 'Open invoices',
      label: plural(unpaid.length, 'unpaid invoice'),
      detail: overdue ? 'At least one is overdue' : 'Pay securely with Stripe',
      tone: overdue ? 'danger' : 'accent',
      meta: mostUrgentDue(unpaid.map((inv) => inv.dueDate), now),
    })
  }

  items.sort((a, b) => a.priority - b.priority)

  // Pace of work: every project update and milestone work-log entry.
  const activityDates = [
    ...project.updates.map((u) => u.createdAt),
    ...milestones.flatMap((m) => (m.milestoneUpdates ?? []).map((u) => u.createdAt)),
  ]
  const activity = getActivityBuckets(activityDates, { days: 14, now })
  const lastActivity = activityDates.length ? Math.max(...activityDates.map((d) => new Date(d).getTime())) : null

  const money = summarizeInvoices(project.invoices, now)
  const hasInvoices = project.invoices.some((inv) => inv.status !== 'CANCELLED')
  const nextDue = getNextDueMilestone(milestones)
  const nextDueText = nextDue ? dueLabel(nextDue.dueDate, now) : null

  const metrics = [
    {
      id: 'money', view: 'invoices', label: 'Outstanding',
      value: money.unpaidCount ? money.outstandingText : hasInvoices ? 'Paid up' : '—',
      hint: money.overdueCount
        ? `${money.overdueCount} overdue`
        : money.unpaidCount
          ? `${plural(money.unpaidCount, 'invoice')} unpaid`
          : hasInvoices ? 'Nothing owed' : 'No invoices yet',
      hintTone: money.overdueCount ? 'danger' : undefined,
    },
    {
      id: 'due', view: 'timeline', label: 'Next due',
      value: nextDueText?.text ?? '—',
      tone: nextDueText?.state === 'overdue' ? 'danger' : nextDueText?.state === 'soon' ? 'accent' : undefined,
      hint: nextDue ? `${formatDate(nextDue.dueDate)} · ${nextDue.title}` : 'Nothing scheduled',
    },
    {
      id: 'requests', view: 'requests', label: 'Open requests',
      value: String(open.length),
      tone: open.length ? 'accent' : undefined,
      hint: open.length ? 'waiting on you' : requests.length ? 'All answered' : 'Nothing needed',
    },
    {
      id: 'activity', view: 'timeline', label: 'Last update',
      value: lastActivity ? timeAgo(lastActivity, { now }) : '—',
      hint: activity.total ? `${plural(activity.total, 'update')} in 14 days` : 'No activity yet',
    },
  ]

  const fallback = nextDue
    ? `Nothing is waiting on you. ${nextDue.title} is next${nextDueText ? `, ${nextDueText.text.toLowerCase()}` : ''}.`
    : 'Nothing is waiting on you.'

  return { items, metrics, activity, fallback }
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
  const overview = buildOverview({ milestones, requests, project, actionItems })
  const attention = overview.items
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
      description: 'Status, next steps and recent activity.',
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
      <div className="space-y-5">
        {/* Reading order is action first; on desktop the hero takes the wide left column. */}
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="fp-rise flex min-w-0 lg:col-span-4 lg:col-start-9 lg:row-start-1" style={{ '--i': 0 }}>
            <NextAction item={attention[0] ?? null} fallback={overview.fallback} moreCount={Math.max(attention.length - 1, 0)} />
          </div>
          <div className="fp-rise flex min-w-0 lg:col-span-8 lg:col-start-1 lg:row-start-1" style={{ '--i': 1 }}>
            <ProgressBanner
              progress={progress}
              projectName={project.name}
              clientName={client.name}
              milestones={milestones}
              current={
                progress.projectStatus === 'ON_TRACK' && progress.currentMilestone ? (
                  <CurrentlyWorkingOn milestone={progress.currentMilestone} bare />
                ) : null
              }
              team={teamMembers?.length ? <ProjectTeam members={teamMembers} bare /> : null}
            />
          </div>
        </div>

        <div className="fp-rise" style={{ '--i': 2 }}>
          <MetricStrip items={overview.metrics} />
        </div>

        <ActionPanel items={actionItems} token={token} />

        <div className="grid gap-5 lg:grid-cols-12">
          <div className="fp-rise min-w-0 space-y-5 lg:col-span-7" style={{ '--i': 3 }}>
            {attention.length > 1 && <AttentionCard items={attention.slice(1)} title="Also waiting on you" />}
            <UpdateFeed updates={project.updates} activity={overview.activity} />
          </div>
          <div className="fp-rise min-w-0 lg:col-span-5" style={{ '--i': 4 }}>
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
