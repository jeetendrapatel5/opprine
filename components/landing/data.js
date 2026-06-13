export const NAV_LINKS = [
  { label: 'Product', href: '#product' },
  { label: 'Workflow', href: '#workflow' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

// ─── HERO ─────────────────────────────────────────────────────────────────────

export const HERO_PRE = 'Client project portals for freelance developers'

export const HERO_HEADLINE = 'Your client deserves better than a Drive folder and a status email.'

export const HERO_SUB =
  'Opprine gives every project a private, dedicated client view - updates, file delivery, approval tracking, and invoicing in one link. No account for your client. No onboarding call. No new tool for them to learn.'

export const HERO_CTA = 'Create your first portal'

export const HERO_SECONDARY_CTA = 'See how it works'

export const HERO_TRUST = [
  'No client account, ever',
  'Every approval timestamped and recorded',
  'Payment inside the moment of completion',
]

export const HERO_METRICS = [
  { value: '4 min', label: 'To launch a client portal' },
  { value: '1 link', label: 'For every client interaction' },
  { value: '0', label: 'Accounts your client ever needs' },
]

// ─── PAIN ─────────────────────────────────────────────────────────────────────
// Framed as a process design failure — not a personal one. This keeps readers
// engaged rather than defensive.

export const PAIN_HEADER = 'Excellent work gets undermined by the process around it.'

export const PAIN_INTRO =
  'Most freelance projects don\'t stall because of technical problems. They drift because the client doesn\'t know where to look, what needs their input, or what comes next. That\'s a process problem and it\'s completely solvable.'

export const PAIN_CARDS = [
  {
    id: 'updates',
    open: 'The project status lives in four different places.',
    body: 'One client follows along in WhatsApp. Another checks email. A third sends a message asking for a call. The answer already exists posted somewhere but finding it takes longer than rebuilding the context from scratch. By then, confidence in the process has already slipped.',
    sting: 'Scattered updates train clients to question the process.',
  },
  {
    id: 'approval',
    open: 'A chat "yes" is not the same as an approval.',
    body: 'Weeks later, a scope question surfaces, a revision lands on your plate, or billing becomes a conversation. You look for proof. What you find is a message thread and a competing memory. The client recalls something different. You cannot win a dispute you cannot document.',
    sting: 'Professional work needs professional records.',
  },
  {
    id: 'files',
    open: 'The handoff matters as much as the work.',
    body: 'A Drive link. A note in the email. A follow-up to confirm they found it. Another version a week later. The work is excellent but the way it arrives makes it feel like a draft. Presentation shapes perception, even when the quality is not in question.',
    sting: 'How you deliver changes what clients think your work is worth.',
  },
  {
    id: 'payment',
    open: 'The best moment to ask for payment passes before the invoice arrives.',
    body: 'The client approves the work. They close the tab. Then an invoice shows up in a separate email thread, disconnected from the satisfaction they just felt. Following up starts to feel like chasing, and chasing changes the dynamic of the relationship.',
    sting: 'Payment belongs inside the moment of completion not after it.',
  },
]

// ─── REFRAME ──────────────────────────────────────────────────────────────────
// Bridge section between pain and solution. Positions Opprine as
// purpose-built for the client-facing moment — not a dashboard repurposed for it.

export const REFRAME_LABEL = 'The fix is not another project management tool.'

export const REFRAME_BODY =
  'Every project already has a client experience. The question is whether you designed it or it designed itself.\n\nOpprine gives each project a private, structured layer built specifically for the client-facing moment not an internal dashboard repurposed for it. One link tells the client what has happened, what needs their attention, what has been approved, and what is ready to pay.\n\nFewer questions. Cleaner decisions. A calmer path from delivery to payment.'

// ─── TRUST DIFFERENTIATORS ────────────────────────────────────────────────────
// Each point addresses a real objection rather than restating a feature.
// Consider rendering this section as "Why it works differently" on the page.

export const TRUST_SIGNALS = [
  {
    title: 'Built for the client, not the freelancer',
    desc: 'Every portal is designed to be read and acted on by someone who doesn\'t know your tools. One link. Obvious next actions. Nothing on their end to configure, install, or learn.',
  },
  {
    title: 'Every approval is a record',
    desc: 'Approvals are attached to the specific deliverable, milestone, and timestamp that produced them not floating in a chat history nobody can locate six weeks later.',
  },
  {
    title: 'Payment is where the work already is',
    desc: 'When a client approves a milestone and sees the invoice directly beneath the outcome, paying is the natural next step not a separate conversation you have to start.',
  },
]

// ─── HOW IT WORKS ─────────────────────────────────────────────────────────────

export const HOW_HEADER = 'From first update to final payment, the whole flow lives in one place.'

export const HOW_STEPS = [
  {
    step: '01',
    title: 'Create the project',
    desc: 'Add the client\'s name, project scope, milestones, and any initial files. Everything that makes the engagement feel intentional from the first interaction.',
    result: 'The project has a home before the first update goes out.',
  },
  {
    step: '02',
    title: 'Share one private link',
    desc: 'Opprine generates a unique, private link for each client. They open it on any device no account to create, no app to download, no onboarding meeting.',
    result: 'The first impression is confidence, not friction.',
  },
  {
    step: '03',
    title: 'Deliver, review, approve',
    desc: 'Post updates, upload deliverables, and request approvals against specific milestones. The client responds directly in their portal. Every decision is recorded where it happens.',
    result: 'Documented decisions. Not vague replies buried in a thread.',
  },
  {
    step: '04',
    title: 'Invoice inside the moment',
    desc: 'When the work is approved, the invoice is already embedded in the same portal where the client just reviewed the outcome. Paying is the obvious next action.',
    result: 'Payment follows completion without a separate conversation to start.',
  },
]

// ─── FEATURES ─────────────────────────────────────────────────────────────────
// Header signals intentionality. Each feature is described by what it changes,
// not just what it is. "Detail" lines are written as practitioner-to-practitioner
// — the honest use case, not the marketing pitch.

export const FEATURES_HEADER = 'Every feature built for the client-facing moment.'

export const FEATURES = [
  {
    icon: 'link',
    name: 'Magic link client portals',
    desc: 'Every client gets a private, project-specific link. It opens their portal instantly - no account creation, no password reset, no getting them onboarded.',
    detail: 'Ideal for clients who won\'t adopt another platform - which is most of them.',
  },
  {
    icon: 'layout',
    name: 'One view your client actually understands',
    desc: 'Milestones, updates, files, approvals, and invoices composed in a single client view. Project status is obvious without a phone call to explain it.',
    detail: 'Designed for how clients read progress - not how freelancers track it.',
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
    desc: 'Approval requests go out with clear context. Client responses are recorded with date, time, and the deliverable they responded to - attached to the project, not to a chat thread.',
    detail: 'Scope protection starts with documentation. You cannot win a dispute you cannot prove.',
  },
  {
    icon: 'activity',
    name: 'Client activity visibility',
    desc: 'Know when the portal was last viewed, which items are waiting on the client, and which projects are stalled - without sending a follow-up into the void.',
    detail: 'Follow up from context, not anxiety. Send when the timing is right, not when the silence gets too long.',
  },
  {
    icon: 'credit',
    name: 'In-portal invoicing and payment',
    desc: 'The invoice is embedded in the client portal, directly beneath the approved work. Paying requires one action - not a separate email thread to start.',
    detail: 'The best moment to ask for payment is the moment the client feels the value of the work. This is that moment.',
  },
]

// ─── PRICING ──────────────────────────────────────────────────────────────────
// Reframe uses a specificity anchor — a dispute or faster payment — rather
// than a vague "pays for itself" claim. The Pro badge renamed to "Most popular"
// which is more credible than "Best value" (value is subjective; popularity is a fact).

export const PRICING_REFRAME =
  'One faster payment or one avoided scope dispute covers Opprine for months. Most freelancers earn it back inside the first project.'

export const PRICING_TIERS = [
  {
    name: 'Free',
    tagline: 'Two real client projects. Fully functional. No card required.',
    price: '$0',
    per: '/ forever',
    highlight: false,
    ctaLabel: 'Start free',
    ctaHref: '/signup',
    features: [
      'Up to 2 active projects',
      'Magic link client portals',
      'Milestone updates and file delivery',
      'Approval tracking with timestamps',
      'Client activity visibility',
    ],
  },
  {
    name: 'Pro',
    tagline: 'For freelancers who run client work as a business, not a side activity.',
    price: '$19',
    per: '/ month',
    badge: 'Most popular',
    highlight: true,
    ctaLabel: 'Start free, upgrade when ready',
    ctaHref: '/signup?plan=pro',
    features: [
      'Unlimited active projects',
      'In-portal invoicing and Stripe payments',
      'Custom portal branding',
      'Priority email support',
      'Early access to workflow upgrades',
    ],
    note: 'No contracts. Cancel anytime. As your client roster grows, the cost stays the same.',
  },
]

// ─── TESTIMONIALS ─────────────────────────────────────────────────────────────
// Header rewritten to anchor the "before state" — makes the product feel like
// a discovery, not a boast. Quotes tuned to feel more specific and naturally
// spoken: concrete details, not polished praise.

export const TESTIMONIALS_HEADER = 'Freelancers who stopped managing clients across scattered tools.'

export const TESTIMONIALS = [
  {
    name: 'Arjun M.',
    role: 'Freelance web developer, Pune',
    rating: 5,
    quote:
      'I used to write a status update email every week because clients kept asking. Now I post once in the portal and they check it when they want. They feel more informed - and I spend that time building instead.',
  },
  {
    name: 'Diana K.',
    role: 'WordPress developer, Warsaw',
    rating: 5,
    quote:
      'I had an approval dispute mid-project last year. Nothing documented, just chat messages and competing memories. Now every milestone has a clean record. My revision conversations are completely different.',
  },
  {
    name: 'Marcus T.',
    role: 'Shopify developer, Manila',
    rating: 5,
    quote:
      'I was giving clients three different links - Notion for scope, Drive for files, email for invoices. Opprine replaced all three with one link they already know how to open.',
  },
  {
    name: 'Priya S.',
    role: 'UI/UX designer, Bangalore',
    rating: 5,
    quote:
      'A client told me the engagement felt like working with a small studio. That\'s exactly the perception I needed before raising my rates. The portal created that - not me.',
  },
  {
    name: 'Kabir N.',
    role: 'Motion designer, Pune',
    rating: 5,
    quote:
      'I used to send the invoice two days after final delivery. By then the momentum was gone. Now the client sees it when they\'re still feeling good about the work. My follow-up time dropped from weeks to hours.',
  },
  {
    name: 'Divya K.',
    role: 'Brand consultant, Chennai',
    rating: 5,
    quote:
      'I show the portal during discovery calls - before I send the proposal. It makes my process tangible immediately. Clients understand exactly what working with me looks like before they commit.',
  },
]

// ─── FOUNDER ──────────────────────────────────────────────────────────────────
// Quote rewritten to name the specific gap the product closes (agency-quality
// work, freelance-quality presentation) and state the goal directly.

export const FOUNDER = {
  name: 'Jeetendra — Founder, Opprine',
  quote:
    'I built this because freelance developers do work that competes with agencies - but often present it like they\'re still freelancing. Opprine is the client-facing layer that closes that gap. Fewer scattered conversations, cleaner decisions, and a professional experience from first update to final payment.',
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
// Header rewritten to signal honesty — "questions worth answering" implies
// real answers, not deflection.
// Two new entries added: cancellation policy and portal privacy.
// These address the objections fence-sitters think about but rarely voice.

export const FAQ_HEADER = 'Questions worth answering before you sign up.'

export const FAQS = [
  {
    q: 'Will clients be confused by yet another tool?',
    a: 'They receive one link. It opens directly to their project - milestones, files, approvals, and invoices already organized. There\'s no account to create and nothing to install. Most clients find it simpler than navigating a shared Drive folder.',
  },
  {
    q: 'Does this replace the tools I already use?',
    a: 'No. Opprine doesn\'t replace your code editor, your file storage, or how you communicate internally. It gives the client a single, polished view of the project - regardless of how you manage it on your end.',
  },
  {
    q: 'Why not just use Notion, Google Drive, or email?',
    a: 'Those tools were built for internal collaboration, not client-facing project management. They work - but they require your client to adapt to your workflow rather than the other way around. Opprine is purpose-built for the client interaction: updates, approvals, file delivery, and payment in one structured experience.',
  },
  {
    q: 'Is the free plan actually usable for real projects?',
    a: 'Yes. The free plan supports two active projects with full portal functionality - updates, files, approvals, and client activity visibility. It\'s designed so you can run real client engagements and decide whether Pro is worth it based on direct experience, not a sales page.',
  },
  {
    q: 'What happens to my portals if I cancel Pro?',
    a: 'Your projects revert to free tier limits. Active portals stay live - clients with existing links can still access their project. Nothing disappears. You decide whether to upgrade again based on what the tool actually does for your work.',
  },
  {
    q: 'How private is the client portal?',
    a: 'Each portal is accessible only through its unique magic link. There is no public directory, no way to search for portals, and no shared login. Sharing the link is sharing the access. You control who has it.',
  },
]

// ─── FINAL CTA ────────────────────────────────────────────────────────────────
// Headline uses a time anchor ("30 seconds") to make the stakes immediate and
// concrete. Converts an abstract concern into a specific, believable moment.
// The body note uses specificity ("five minutes", "before the project is finished")
// to make the promise feel real, not aspirational.

export const FINAL_HEADLINE = 'Your client forms an opinion of your process within the first 30 seconds. Make it the right one.'

export const FINAL_BODY =
  'Set up a portal in under five minutes, share one private link, and give your client the kind of experience that makes them refer you before the project is even finished.'

export const FINAL_CTA = 'Create your first portal - it\'s free'

export const FINAL_NOTE = 'Two active projects free. No credit card. Upgrade only when the workflow earns its place.'

// ─── FOOTER ───────────────────────────────────────────────────────────────────

export const FOOTER_TAGLINE = 'Professional client portals for freelance developers and independent service businesses.'

export const FOOTER_COPYRIGHT = 'Copyright 2026 Opprine. Built for independent professionals.'

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