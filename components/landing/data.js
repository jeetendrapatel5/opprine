// components/landing/data.js
// Single source of truth for all landing page content.

// ── Navigation ────────────────────────────────────────────────────────────────
export const NAV_LINKS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Features',     href: '#features'     },
  { label: 'Pricing',      href: '#pricing'       },
]

// ── Hero ──────────────────────────────────────────────────────────────────────
export const HERO_PRE        = 'For freelance web developers'
export const HERO_HEADLINE_1 = 'Your work is professional.'
export const HERO_HEADLINE_2 = "Your client process isn't."
export const HERO_SUB        = 'One magic link. Your client sees every update, approves deliverables, and pays invoices — without creating an account. You look like you run a proper studio. Because now you do.'
export const HERO_CTA        = 'Start free — no credit card needed'
export const HERO_TRUST      = 'Free forever on 2 projects · No credit card · Set up in 4 minutes'

// ── Pain Section ──────────────────────────────────────────────────────────────
export const PAIN_HEADER = 'Sound familiar?'
export const PAIN_CARDS  = [
  {
    id: 'silence',
    open: 'You delivered the work.\nThree days ago.',
    body: "The client hasn't replied. You've checked your email four times this morning. You check WhatsApp. Nothing. You're not sure if they loved it, hated it, or are composing a 'this isn't what I wanted' message that'll ruin your week.",
    sting: "That silence isn't neutral. It's expensive.",
  },
  {
    id: 'approval',
    open: '"I don\'t remember approving that."',
    body: "You scroll back through 200 messages trying to find the moment they said yes. There it is — buried between a meme they sent and a question about their logo colour. But it doesn't look like an approval. It looks like a chat.",
    sting: 'So you eat the revision. Again. Because arguing over WhatsApp screenshots isn\'t worth the relationship.',
  },
  {
    id: 'perception',
    open: 'You want to charge ₹80,000 for this project.\nYour process looks like a ₹15,000 freelancer\'s.',
    body: 'No dedicated client space. Files scattered across Drive links. Status updates sent manually when they ask. You know the work is worth the number. But somewhere between your skill and your presentation, the client is making a different calculation.',
    sting: null,
  },
  {
    id: 'invoice',
    open: 'Invoice sent. "I\'ll get to it."\nSix weeks later. You\'re still waiting.',
    body: '"Sorry, been busy." Another week. You need the money. You don\'t want to seem desperate. So you wait. And follow up politely. And hate every second of it.',
    sting: 'You need a system that makes payment the obvious next step — not an awkward conversation.',
  },
]

// ── Reframe Section ───────────────────────────────────────────────────────────
export const REFRAME_LABEL = "It's not you. It's your setup."
export const REFRAME_BODY  = "The chaos isn't a character flaw. It's what happens when you run a professional relationship through tools built for something else — a messaging app and a folder. That's not a system. It's a liability.\n\nThere's a simpler way. One link. One place. Everything your client needs to see, and nothing they don't."

// ── How It Works ──────────────────────────────────────────────────────────────
export const HOW_HEADER = 'Set up in 4 minutes. Used for every project after that.'
export const HOW_STEPS  = [
  {
    step: '01',
    title: 'You build the project',
    desc: 'Create a project, add milestones, write a short description. Takes 4 minutes the first time. 90 seconds every time after.',
    result: 'Your client relationship already has more structure than 90% of freelancers provide.',
  },
  {
    step: '02',
    title: 'Your client gets a link',
    desc: 'One magic link. No signup. No password. They click it — on their phone, laptop, anywhere — and see a clean, professional portal with your name on it.',
    result: "Your client's first impression is that they hired someone who runs a real business.",
  },
  {
    step: '03',
    title: 'Everything in one place',
    desc: "Milestone updates, file deliveries, feedback, approvals, and invoices — all inside the same link. When you mark something ready, they get an email. When they approve, you get notified.",
    result: "No more chasing, no more scattered threads, no more 'I never saw that.'",
  },
]

// ── Features ──────────────────────────────────────────────────────────────────
export const FEATURES_HEADER = 'Six things that fix the parts of freelancing you hate most.'
export const FEATURES = [
  {
    icon: '🔗',
    name: 'Magic Link Portal',
    desc: 'Your client sees everything they need without creating a single account.',
    fix: "Fixes: clients who won't open 'yet another tool'",
    previewKey: 'portal',
  },
  {
    icon: '📦',
    name: 'Milestone Delivery Cards',
    desc: 'Send a polished delivery — headline, summary, file preview — and your client gets an email with a direct link to approve or give feedback.',
    fix: 'Fixes: work delivered over WhatsApp that gets lost, ignored, or disputed',
    previewKey: 'milestones',
  },
  {
    icon: '✅',
    name: 'Timestamped Approvals',
    desc: "Every 'yes' is recorded with a date, time, and exactly what was approved. No memory required.",
    fix: "Fixes: 'I never agreed to that' — forever",
    previewKey: 'updates',
  },
  {
    icon: '👁',
    name: 'Client Activity Tracking',
    desc: 'See exactly when your client last viewed the portal. Stop wondering. Know.',
    fix: 'Fixes: the low-grade anxiety of sending work into silence',
    previewKey: 'portal',
  },
  {
    icon: '💳',
    name: 'In-Portal Invoicing',
    desc: "When the work is done, the invoice is already where the client is. One click to pay.",
    fix: 'Fixes: the awkward 6-week payment chase that makes you feel like a debt collector',
    previewKey: 'files',
  },
  {
    icon: '📊',
    name: 'Single Dashboard',
    desc: 'All your active projects, client activity, milestone statuses, and what needs attention today — in one view.',
    fix: 'Fixes: the context-switching nightmare of managing 4 clients across 5 apps',
    previewKey: 'portal',
  },
]

// ── Pricing ───────────────────────────────────────────────────────────────────
export const PRICING_REFRAME = 'One late payment costs you more in time and stress than a full year of Freeport.'
export const PRICING_TIERS   = [
  {
    name:      'Free',
    tagline:   'For freelancers getting started. No card. Ever.',
    price:     '₹0',
    per:       '/ forever',
    highlight: false,
    ctaLabel:  'Start for free',
    ctaHref:   '/signup',
    features: [
      'Up to 2 active projects',
      'Full portal — magic link, milestones, delivery cards',
      'Timestamped approvals',
      'Client activity tracking',
      'Everything you need to look like a professional',
    ],
  },
  {
    name:      'Pro',
    tagline:   'For freelancers doing real volume.',
    price:     '₹2,499',
    per:       '/ month',
    badge:     'Most popular',
    highlight: true,
    ctaLabel:  'Start free, upgrade when ready',
    ctaHref:   '/signup?plan=pro',
    features: [
      'Unlimited active projects',
      'In-portal invoicing + Stripe payments',
      'Custom portal branding',
      'Priority email support',
      'Early access to new features',
    ],
    note: 'No contracts. Cancel anytime. The first project you retain because of a better experience pays for a year of this.',
  },
]

// ── Testimonials ──────────────────────────────────────────────────────────────
export const TESTIMONIALS_HEADER = 'Freelancers who stopped winging it.'
export const TESTIMONIALS = [
  {
    name:   'Arjun M.',
    role:   'Freelance web developer, Pune',
    rating: 5,
    quote:  'The first time a client clicked the link and saw their project portal, they messaged me: "This looks really professional." That one message got me a referral within the same week. I\'ve raised my rates since.',
  },
  {
    name:   'Diana K.',
    role:   'WordPress developer, Warsaw',
    rating: 5,
    quote:  'I had a client dispute a revision two months into a project. Before Freeport I would have lost that argument — I had nothing in writing. But there it was: approval, timestamp, exact milestone. The dispute was over in one message.',
  },
  {
    name:   'Marcus T.',
    role:   'Shopify developer, Manila',
    rating: 5,
    quote:  "I was using Notion, Drive, and email to manage clients. I thought that was 'a system.' It wasn't. The first project I ran through Freeport, the client paid 4 days after delivery. No follow-up. They just... paid.",
  },
  {
    name:   'Priya S.',
    role:   'UI/UX Designer, Bangalore',
    rating: 5,
    quote:  "My client commented that I run things 'like a real agency.' I used to send updates via WhatsApp voice notes.",
  },
  {
    name:   'Kabir N.',
    role:   'Motion Designer, Pune',
    rating: 5,
    quote:  "My last three clients paid within hours of me marking the project done. There's a big 'Pay Now' button right in the portal.",
  },
  {
    name:   'Divya K.',
    role:   'Brand Consultant, Chennai',
    rating: 5,
    quote:  "I showed a client their portal on the first discovery call. Before I'd even proposed a number, they said 'let's move forward.' Closed the deal that day.",
  },
]

// ── Founder Note ──────────────────────────────────────────────────────────────
export const FOUNDER = {
  name:  'Jeetu, Founder',
  quote: "I built Freeport because I've lived every problem on this page. I lost a client because my process felt amateurish. I ate a revision because I couldn't prove the approval. I chased a payment for 52 days while pretending I wasn't stressed about it. There wasn't a tool built for how developers actually work with clients — so I built one.",
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
export const FAQ_HEADER = 'Fair questions.'
export const FAQS = [
  {
    q: "My clients are used to how we work. Won't this confuse them?",
    a: "Probably not. They click one link. The portal opens. It has their project name on it, their milestones, their files. There's nothing to learn. If anything, they'll be relieved someone finally made it this clear.",
  },
  {
    q: "I barely have time to manage my projects, let alone set up a new tool.",
    a: "The setup for one project takes 4 minutes. Add the project name, set 3–5 milestones, copy the link. That's it. Freeport doesn't require you to change how you work — it just gives your client somewhere better to look.",
  },
  {
    q: 'I already use Notion / Google Drive / email for this. Why switch?',
    a: "Those tools aren't broken. They're just not designed for this. Notion is your thinking tool. Drive is your file storage. None of them give your client a structured, professional experience of your project. Freeport does that one thing extremely well.",
  },
]

// ── Final CTA ─────────────────────────────────────────────────────────────────
export const FINAL_HEADLINE = 'Your next client deserves a better experience.\nSo do you.'
export const FINAL_BODY     = 'Stop sending project updates over WhatsApp. Stop chasing approvals through email threads. Stop wondering whether they saw it, liked it, or are about to ghost you.'
export const FINAL_CTA      = 'Start free — no credit card needed'
export const FINAL_NOTE     = 'Free plan available. No contracts. Cancel Pro anytime.'

// ── Footer ────────────────────────────────────────────────────────────────────
export const FOOTER_TAGLINE   = 'The client portal for serious freelancers.'
export const FOOTER_COPYRIGHT = '© 2025 Freeport. Built by a freelancer, for freelancers.'
export const FOOTER_LINKS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features',  href: '#features'     },
      { label: 'Pricing',   href: '#pricing'       },
      { label: 'Changelog', href: '/changelog'     },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About',   href: '/about'   },
      { label: 'Blog',    href: '/blog'    },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms',   href: '/terms'   },
    ],
  },
]