import { PLAN_CONFIG, UNLIMITED } from '../../lib/billing/plans.js'
import { formatINR } from '../../lib/billing/format.js'

export const FINAL_CTA = 'Get started free'
export const FINAL_NOTE = 'No credit card required.'

const plans = [
  ['FREE', 'For getting your first client projects organized'],
  ['PRO', 'For freelancers managing a regular roster of clients'],
  ['TEAM', 'For studios delivering projects together'],
]

function formatLimit(limit, singular, plural) {
  if (limit === UNLIMITED) return `Unlimited ${plural}`
  return limit === 1 ? `1 ${singular}` : `Up to ${limit} ${plural}`
}

export const PRICING_TIERS = plans.map(([key, description]) => {
  const { displayName: name, pricing, limits } = PLAN_CONFIG[key]
  return {
    name,
    description,
    price: formatINR(pricing?.monthly.amount ?? 0),
    period: pricing ? '/ month' : 'without a subscription',
    cta: pricing ? `Get started with ${name}` : FINAL_CTA,
    note: pricing ? 'Choose this plan after signup.' : FINAL_NOTE,
    features: [
      formatLimit(limits.maxProjects, 'project', 'projects'),
      formatLimit(limits.maxClients, 'client', 'clients'),
      formatLimit(limits.maxWorkspaceMembers, 'workspace member', 'workspace members'),
      ...(limits.githubIntegration ? ['GitHub commit summaries'] : []),
      ...(limits.customBranding ? ['Custom portal branding'] : []),
    ],
  }
})

export const FAQS = [
  ['Who is Opprine for?', 'Opprine is built for freelance web developers and small web agencies that need to keep clients informed and move projects through review, delivery and payment.'],
  ['Do my clients need an account?', 'No. Share the private link to their project and they can open the portal without creating an account. Share it only with people who should have access.'],
  ['Do I have to connect GitHub?', 'No. You can manage milestones and share a client portal without connecting a repository. GitHub commit summaries are available on Pro and Team.'],
  ['What can clients see in the portal?', 'The portal shows client visible milestones, updates, files, approval requests and invoices. Internal project notes stay in the studio workspace.'],
  ['How does Opprine record a client approval?', 'Send the milestone for review. The client can approve it or request changes, and the response is recorded with the project.'],
  ['Can I start without paying?', 'Yes. The Free plan includes two projects, two clients and one workspace member. You can upgrade from your dashboard when you need more.'],
]
