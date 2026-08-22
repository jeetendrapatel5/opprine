export const NAV_LINKS = [
  { label: 'Product', href: '#product' },
  { label: 'Workflow', href: '#workflow' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

// ─── HERO ─────────────────────────────────────────────────────────────────────

export const HERO_PRE = 'Client delivery software for web development studios'

export const HERO_HEADLINE = 'Your code already proves you\'re working. Now your client can see it.'

export const HERO_SUB =
  'Opprine reads every commit and turns it into a client-ready update, automatically then ties it to milestone approvals, invoicing, and a record that protects you when a delay isn\'t your fault.'

export const HERO_CTA = 'Start Free Trial'

export const HERO_SECONDARY_CTA = 'See how it works'

export const HERO_TRUST = [
  'Every commit becomes a client-ready update',
  'Every delay timestamped, so blame lands where it belongs',
  'Every approval tied directly to payment',
]

export const HERO_METRICS = [
  { value: 'Auto', label: 'Client updates from your commits' },
  { value: '1 link', label: 'For every client interaction' },
  { value: '0', label: 'Status calls required' },
]

// ─── PAIN ─────────────────────────────────────────────────────────────────────
// Framed as a process design failure — not a personal one. This keeps readers
// engaged rather than defensive.

export const PAIN_HEADER = 'Excellent work gets undermined by how it\'s communicated.'

export const PAIN_INTRO =
  'Most studio projects don\'t stall because of technical problems. They drift because the client can\'t see what\'s actually happening, doesn\'t know what needs their input, or doesn\'t know what comes next. That\'s a process problem, and it\'s completely solvable.'

export const PAIN_CARDS = [
  {
    id: 'updates',
    open: 'The project status lives in your head, not anywhere your client can see it.',
    body: 'Your team has been heads-down for three days shipping real progress. The client thinks you\'ve gone quiet. So they message, you stop to explain, and the actual work waits while someone writes a paragraph about it instead of building.',
    sting: 'Every manual status update is time nobody bills for.',
  },
  {
    id: 'approval',
    open: 'A missed deadline gets blamed on you even when it wasn\'t yours.',
    body: 'A deadline slips. You know exactly why: the client sat on a review for eight days. But you have no clean way to prove it, so you quietly absorb the blame instead of having the awkward conversation.',
    sting: 'You cannot defend a delay you cannot document.',
  },
  {
    id: 'files',
    open: 'The handoff matters as much as the work.',
    body: 'A Drive link. A message to confirm they found it. A revised version a week later. The work is excellent, but the way it arrives makes a studio look like a folder someone forgot to organize.',
    sting: 'How you deliver changes what clients think your studio is worth.',
  },
  {
    id: 'payment',
    open: 'The best moment to ask for payment passes before the invoice arrives.',
    body: 'The client approves the milestone. They close the tab, still feeling good about the work. Then an invoice shows up in a separate thread days later, disconnected from that moment entirely. Following up starts to feel like chasing.',
    sting: 'Payment belongs inside the moment of approval, not after it.',
  },
]

// ─── REFRAME ──────────────────────────────────────────────────────────────────
// Bridge section between pain and solution. Positions Opprine as reading a
// record that already exists (git) rather than asking anyone to create one.

export const REFRAME_LABEL = 'The fix is not another project management tool.'

export const REFRAME_BODY =
  'Every project already produces a record of what happened it\'s sitting in your git history. The question is whether your client ever gets to see it.\n\nOpprine reads your commits and turns them into a client-ready update automatically, then ties that update to milestones, approvals, and invoicing inside one private link not a dashboard someone has to remember to fill in.\n\nFewer status calls. Undeniable proof of progress. A record that protects you when a delay isn\'t your fault.'

// ─── TRUST DIFFERENTIATORS ────────────────────────────────────────────────────
// Each point addresses a real objection rather than restating a feature.

export const TRUST_SIGNALS = [
  {
    title: 'Built from your code, not typed by hand',
    desc: 'Every update starts from real git activity, translated into plain language your client understands. Nothing to remember to write it already knows what you built.',
  },
  {
    title: 'Every delay is timestamped and attributed',
    desc: 'When a project is waiting on a client, Opprine records exactly when and why. If a deadline slips, the record shows whose court the ball was in automatically, with no awkward email required.',
  },
  {
    title: 'Payment is where the work already is',
    desc: 'When a client approves a milestone and sees the invoice directly beneath it, paying is the natural next step, not a separate conversation you have to start.',
  },
]

// ─── HOW IT WORKS ─────────────────────────────────────────────────────────────

export const HOW_HEADER = 'From first commit to final payment, the whole flow lives in one place.'

export const HOW_STEPS = [
  {
    step: '01',
    title: 'Connect your GitHub repo',
    desc: 'Link the repo for the project. Takes two minutes and changes nothing about how your team already commits code.',
    result: 'The project has a live source of truth before the first update goes out.',
  },
  {
    step: '02',
    title: 'Opprine turns commits into updates',
    desc: 'Every meaningful commit is translated into a plain-English update your client can actually read, organized against the milestones you\'ve defined.',
    result: 'The client sees real progress without a single status message from you.',
  },
  {
    step: '03',
    title: 'Deliver, approve, get flagged when you\'re blocked',
    desc: 'Upload deliverables, request milestone approvals, and let Opprine timestamp any stretch where you\'re waiting on the client for feedback, assets, or sign-off.',
    result: 'Every decision and every delay is documented where it happened.',
  },
  {
    step: '04',
    title: 'Invoice inside the moment',
    desc: 'When a milestone is approved, the invoice is already sitting in the same portal the client just reviewed. Paying is the obvious next action.',
    result: 'Payment follows approval without a separate conversation to start.',
  },
]

export const FEATURES_HEADER = 'Every feature built around what you actually built.'

export const FEATURES = [
  {
    icon: 'code',
    name: 'AI commit-to-client updates',
    desc: 'Opprine reads every commit and turns it into a plain-English update your client actually understands no dev jargon, no status report to write.',
    detail: 'The single biggest time sink in client work, solved by data that already exists.',
  },
  {
    icon: 'link',
    name: 'Magic link client portals',
    desc: 'Every client gets a private, project-specific link. It opens their portal instantly no account creation, no password reset, no getting them onboarded.',
    detail: 'Ideal for clients who won\'t adopt another platform which is most of them.',
  },
  {
    icon: 'layout',
    name: 'One view your client actually understands',
    desc: 'Milestones, updates, files, approvals, and invoices composed in a single client view. Project status is obvious without a phone call to explain it.',
    detail: 'Designed for how clients read progress not how studios track it.',
  },
  {
    icon: 'file',
    name: 'Structured file delivery',
    desc: 'Every file lives alongside its context: what it is, which milestone it belongs to, and what action the client should take next. Not floating in a Drive link.',
    detail: 'Presentation shapes perception. A packaged handoff signals quality before they open the file.',
  },
  {
    icon: 'check',
    name: 'Timestamped approvals',
    desc: 'Approval requests go out with clear context. Client responses are recorded with date, time, and the deliverable they responded to attached to the project, not to a chat thread.',
    detail: 'Scope protection starts with documentation. You cannot win a dispute you cannot prove.',
  },
  {
    icon: 'shield',
    name: 'Delay attribution',
    desc: 'When you\'re waiting on a client for feedback, an asset, or a sign-off, Opprine timestamps it automatically. If a deadline slips, the record shows exactly why and it isn\'t you.',
    detail: 'You stay the professional. The record does the explaining.',
  },
  {
    icon: 'credit',
    name: 'In-portal invoicing and payment',
    desc: 'The invoice is embedded in the client portal, directly beneath the approved work. Paying requires one action not a separate email thread to start.',
    detail: 'The best moment to ask for payment is the moment the client feels the value of the work. This is that moment.',
  },
]

export const PRICING_REFRAME =
  'One avoided scope dispute or one delay you didn\'t get blamed for covers Opprine for months. Most studios earn it back inside the first project.'

export const PRICING_TIERS = [
  {
    name: 'Studio',
    tagline: 'For studios running real client projects, not side gigs.',
    price: '$89',
    per: '/ month',
    badge: 'Most popular',
    highlight: true,
    ctaLabel: 'Start free trial',
    ctaHref: '/signup?plan=studio',
    features: [
      'Up to 10 active client projects',
      'AI commit-to-client updates',
      'Milestone approvals and delay attribution',
      'In-portal invoicing and Stripe payments',
      'Custom portal branding',
    ],
    note: 'No contracts. Cancel anytime.',
  },
  {
    name: 'Agency',
    tagline: 'For agencies managing a full roster of client work.',
    price: '$219',
    per: '/ month',
    highlight: false,
    ctaLabel: 'Start free trial',
    ctaHref: '/signup?plan=agency',
    features: [
      'Unlimited active client projects',
      'Up to 10 team seats',
      'Everything in Studio',
      'Custom domain',
      'Priority support',
    ],
    note: 'Built for teams managing more than one client at a time.',
  },
]

export const TESTIMONIALS_HEADER = 'Studios who stopped writing status updates by hand.'

export const TESTIMONIALS = [
  {
    name: 'Ankit',
    role: 'Studio founder',
    rating: 5,
    quote:
      'Placeholder I used to write a status update every week because clients kept asking. Now the commits write it for me I spend that time building instead.',
  },
  {
    name: 'Ajay',
    role: 'Studio lead',
    rating: 5,
    quote:
      'Placeholder A deadline slipped because a client sat on a review for a week. For the first time I had a record showing exactly why, instead of just apologizing.',
  },
  {
    name: 'Daniel',
    role: 'Agency owner',
    rating: 5,
    quote:
      'Placeholder I was giving clients three different links Notion for scope, Drive for files, email for invoices. One link replaced all three.',
  },
]

// ─── FOUNDER ──────────────────────────────────────────────────────────────────

export const FOUNDER = {
  name: 'Jeetendra - Founder, Opprine',
  quote:
    'I built this because studios do work that proves itself in the commit history but present it like a status update nobody has reason to trust. Opprine reads what you actually built and turns it into the client-facing record that closes that gap: fewer status calls, undeniable proof of progress, and a paper trail that protects you when a delay isn\'t your fault.',
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

export const FAQ_HEADER = 'Questions worth answering before you sign up.'

export const FAQS = [
  {
    q: 'Will clients be confused by yet another tool?',
    a: 'They receive one link. It opens directly to their project milestones, files, approvals, and invoices already organized. There\'s no account to create and nothing to install.',
  },
  {
    q: 'Does this replace the tools I already use?',
    a: 'No. Opprine doesn\'t replace your code editor, your git workflow, or how you communicate internally. It reads what\'s already happening and gives the client a single, polished view of it.',
  },
  {
    q: 'Why not just use Notion, Google Drive, or email?',
    a: 'Those tools were built for internal collaboration, not client-facing delivery. They work but they require your client to adapt to your workflow, and none of them know what you actually built. Opprine is purpose-built for that: updates, approvals, file delivery, and payment in one structured experience.',
  },
  {
    q: 'What if my client isn\'t technical?',
    a: 'That\'s exactly who Opprine writes for. Every commit gets translated into plain language no dev jargon, no assumptions about what your client already knows.',
  },
  {
    q: 'Is this just a GitHub tool?',
    a: 'GitHub is the source. The product is what happens next updates, approvals, invoicing, and a record that protects you when a delay isn\'t your fault.',
  },
  {
    q: 'What happens to my portals if I cancel?',
    a: 'Active portals stay live for a grace period so nothing disappears on your clients mid-project. You can export your full project history at any time.',
  },
  {
    q: 'How private is the client portal?',
    a: 'Each portal is accessible only through its unique magic link. There is no public directory, no way to search for portals, and no shared login. Sharing the link is sharing the access. You control who has it.',
  },
]

// ─── FINAL CTA ────────────────────────────────────────────────────────────────

export const FINAL_HEADLINE = 'Your client forms an opinion of your process within the first 30 seconds. Make it the right one.'

export const FINAL_BODY =
  'Connect your GitHub repo, share one private link, and give your client a record of progress they don\'t have to take your word for.'

export const FINAL_CTA = 'Start your free trial'

export const FINAL_NOTE = '14-day free trial. No credit card required to start.'

// ─── FOOTER ───────────────────────────────────────────────────────────────────

export const FOOTER_TAGLINE = 'Client delivery software for web development studios who\'d rather ship than explain.'

export const FOOTER_COPYRIGHT = 'Copyright 2026 Opprine. Built for web development studios.'

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