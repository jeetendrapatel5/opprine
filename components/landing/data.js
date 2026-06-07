// components/landing/data.js
// Centralized landing-page copy for Client Portal.

export const NAV_LINKS = [
  { label: 'Product', href: '#product' },
  { label: 'Workflow', href: '#workflow' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

export const HERO_PRE = 'Client operations for freelance developers'
export const HERO_HEADLINE = 'Client Portal for serious freelancers'
export const HERO_SUB =
  'Create a project, send one private link, and give clients a polished place to review updates, approve work, download files, and pay invoices. No client account required.'
export const HERO_CTA = 'Create your first portal'
export const HERO_SECONDARY_CTA = 'Preview the workflow'
export const HERO_TRUST = [
  'No client login',
  'Private project links',
  'Approvals and payments in one place',
]
export const HERO_METRICS = [
  { value: '4 min', label: 'average setup' },
  { value: '1 link', label: 'for every client action' },
  { value: '0', label: 'client accounts required' },
]

export const PAIN_HEADER = 'Your work feels premium. Your client process should too.'
export const PAIN_INTRO =
  'Freelance projects rarely fall apart because the developer cannot build. They drift when updates, approvals, files, and invoices live across too many tools.'
export const PAIN_CARDS = [
  {
    id: 'updates',
    open: 'Status lives in scattered messages.',
    body: 'Clients ask what changed, what is next, and where the latest link is. You answer manually, even when the answer already exists somewhere else.',
    sting: 'Every extra explanation makes the project feel less controlled.',
  },
  {
    id: 'approval',
    open: 'Approvals are easy to dispute.',
    body: 'A quick yes in chat is not the same as a recorded approval. When scope pressure appears, screenshots and memory become a weak operating system.',
    sting: 'Professional work needs professional records.',
  },
  {
    id: 'files',
    open: 'Deliverables arrive without ceremony.',
    body: 'A Drive link, a note, a follow-up, another version. The work may be excellent, but the handoff does not feel considered.',
    sting: 'Presentation changes how clients value the work.',
  },
  {
    id: 'payment',
    open: 'Payment becomes a separate chase.',
    body: 'The invoice sits in another email thread after the client has already reviewed the work. Paying becomes something to remember later.',
    sting: 'The best moment to ask for payment is inside the moment of completion.',
  },
]

export const REFRAME_LABEL = 'The fix is not another dashboard.'
export const REFRAME_BODY =
  'It is a client-facing operating room for each project: clean, private, structured, and obvious. One link tells the client what happened, what needs attention, what was approved, and what is ready to pay.\n\nClient Portal gives freelancers the calm, agency-grade layer that clients expect from premium work.'

export const TRUST_SIGNALS = [
  {
    title: 'Private by default',
    desc: 'Each client receives a project-specific magic link. No shared inbox archaeology, no public folders.',
  },
  {
    title: 'Approval history',
    desc: 'Every approval is tied to the deliverable, time, and project context that produced it.',
  },
  {
    title: 'Payment-ready handoff',
    desc: 'Invoices sit beside the work, so the next step is clear when the client is ready to move.',
  },
]

export const HOW_HEADER = 'From project setup to paid invoice, the flow stays clear.'
export const HOW_STEPS = [
  {
    step: '01',
    title: 'Create the project',
    desc: 'Add the client, scope, milestones, files, and the few details that make the engagement feel organized from day one.',
    result: 'Your process has a home before the first update is sent.',
  },
  {
    step: '02',
    title: 'Share one private link',
    desc: 'The client opens a polished portal on any device. No signup, no password, no new workspace to learn.',
    result: 'The first impression is confidence, not friction.',
  },
  {
    step: '03',
    title: 'Deliver, review, approve',
    desc: 'Updates, files, feedback, and approvals stay attached to the right milestone, so nobody has to reconstruct the thread later.',
    result: 'You get decisions instead of vague replies.',
  },
  {
    step: '04',
    title: 'Invoice in context',
    desc: 'When the work is accepted, the invoice is already where the client is reviewing the outcome.',
    result: 'Payment becomes the obvious next action.',
  },
]

export const FEATURES_HEADER = 'Everything clients need to trust the process.'
export const FEATURES = [
  {
    icon: 'link',
    name: 'Magic link portals',
    desc: 'Send a private client portal that opens instantly without an account, password, or onboarding call.',
    detail: 'Best for high-friction clients who will not adopt another tool.',
  },
  {
    icon: 'layout',
    name: 'Project command center',
    desc: 'Keep milestones, progress, files, invoices, and next actions visible in one composed client view.',
    detail: 'Best for making complex work feel simple.',
  },
  {
    icon: 'file',
    name: 'Polished deliverables',
    desc: 'Package every delivery with context, file access, status, and the exact decision you need from the client.',
    detail: 'Best for making handoffs feel premium.',
  },
  {
    icon: 'check',
    name: 'Timestamped approvals',
    desc: 'Capture approvals and change requests in the same place as the work, with project context preserved.',
    detail: 'Best for protecting scope and reducing rework.',
  },
  {
    icon: 'activity',
    name: 'Client activity',
    desc: 'Know when the portal was viewed, what needs attention, and which projects are waiting on a client decision.',
    detail: 'Best for replacing anxious follow-ups with useful timing.',
  },
  {
    icon: 'credit',
    name: 'Invoice handoff',
    desc: 'Put payment in the same clean experience as the approved work, so billing feels like part of the project.',
    detail: 'Best for shortening the distance between done and paid.',
  },
]

export const PRICING_REFRAME =
  'A single avoided dispute, faster approval, or earlier payment can cover Client Portal many times over.'
export const PRICING_TIERS = [
  {
    name: 'Free',
    tagline: 'For testing the workflow with your first clients.',
    price: 'Rs. 0',
    per: '/ forever',
    highlight: false,
    ctaLabel: 'Start free',
    ctaHref: '/signup',
    features: [
      'Up to 2 active projects',
      'Magic link client portals',
      'Milestones, updates, and files',
      'Approval tracking',
      'Client activity visibility',
    ],
  },
  {
    name: 'Pro',
    tagline: 'For freelancers running paid client work every month.',
    price: 'Rs. 2,499',
    per: '/ month',
    badge: 'Best value',
    highlight: true,
    ctaLabel: 'Start free, upgrade when ready',
    ctaHref: '/signup?plan=pro',
    features: [
      'Unlimited active projects',
      'In-portal invoicing and payments',
      'Custom portal branding',
      'Priority email support',
      'Early access to workflow upgrades',
    ],
    note: 'No contracts. Cancel anytime. Keep the client experience premium as your workload grows.',
  },
]

export const TESTIMONIALS_HEADER = 'Built for the freelancers clients already trust.'
export const TESTIMONIALS = [
  {
    name: 'Arjun M.',
    role: 'Freelance web developer, Pune',
    rating: 5,
    quote:
      'The portal changed the tone of the project immediately. My client stopped asking for status updates because the answer was always in the link.',
  },
  {
    name: 'Diana K.',
    role: 'WordPress developer, Warsaw',
    rating: 5,
    quote:
      'I used to treat approvals like a chat message. Now every milestone has a clean decision trail, and my revision conversations are calmer.',
  },
  {
    name: 'Marcus T.',
    role: 'Shopify developer, Manila',
    rating: 5,
    quote:
      'I was juggling Notion, Drive, and email. Client Portal made the project feel like one professional experience instead of five tabs.',
  },
  {
    name: 'Priya S.',
    role: 'UI/UX designer, Bangalore',
    rating: 5,
    quote:
      'A client told me the process felt like working with a small studio. That is exactly the perception I needed before raising my rates.',
  },
  {
    name: 'Kabir N.',
    role: 'Motion designer, Pune',
    rating: 5,
    quote:
      'The payment link being next to the approved work sounds small, but it completely changed my follow-up rhythm.',
  },
  {
    name: 'Divya K.',
    role: 'Brand consultant, Chennai',
    rating: 5,
    quote:
      'I now show the portal during discovery calls. It makes my process tangible before the proposal even lands.',
  },
]

export const FOUNDER = {
  name: 'Jeetu, Founder',
  quote:
    'Client Portal exists because freelance developers deserve a client experience that matches the quality of their work. The goal is simple: fewer scattered conversations, clearer decisions, and a calmer path to getting paid.',
}

export const FAQ_HEADER = 'A few practical questions.'
export const FAQS = [
  {
    q: 'Will clients be confused by another tool?',
    a: 'They only receive one link. It opens their project portal with milestones, files, approvals, and invoices already organized. There is no client account to create.',
  },
  {
    q: 'Can I still work the way I do now?',
    a: 'Yes. Client Portal does not replace your build tools, file storage, or communication style. It gives the client one polished place to understand the project and take action.',
  },
  {
    q: 'Why not use Notion, Google Drive, or email?',
    a: 'Those tools are useful, but they are not designed to package a paid client engagement. Client Portal is intentionally built around project progress, approvals, files, and payment.',
  },
  {
    q: 'Is the free plan actually usable?',
    a: 'Yes. The free plan is designed so you can run real client projects through the portal before deciding whether Pro is worth it.',
  },
]

export const FINAL_HEADLINE = 'Give your next client the experience your work already deserves.'
export const FINAL_BODY =
  'Set up a polished portal, share one private link, and turn scattered client communication into a clear project experience.'
export const FINAL_CTA = 'Start with a free portal'
export const FINAL_NOTE = 'Free plan available. No credit card. Upgrade only when the workflow earns its place.'

export const FOOTER_TAGLINE = 'Premium client portals for serious freelance developers.'
export const FOOTER_COPYRIGHT = 'Copyright 2026 Client Portal. Built for independent professionals.'
export const FOOTER_LINKS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Workflow', href: '#workflow' },
      { label: 'Pricing', href: '#pricing' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
]
