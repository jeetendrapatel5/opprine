// ─────────────────────────────────────────────────────────────────────────────
// components/landing/data.js
//
// THE SINGLE SOURCE OF TRUTH FOR ALL CONTENT.
//
// Rule: Never put visible text inside a component.
// When marketing copy changes → edit this file only.
// When you add a new feature tab → add one object to FEATURES.
// When you add a pricing tier → add one object to PRICING_TIERS.
// ─────────────────────────────────────────────────────────────────────────────

// ── Navigation ────────────────────────────────────────────────────────────────
export const NAV_LINKS = [
  { label: 'Features',     href: '#features'    },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing',      href: '#pricing'      },
  { label: 'Testimonials', href: '#testimonials' },
]

// ── Hero ──────────────────────────────────────────────────────────────────────
export const HERO_BADGE   = 'Showcase pages now live — share your work publicly'
export const HERO_LINE_1  = 'Your clients deserve'
export const HERO_TYPED   = ['magic link.', 'one portal.', 'zero friction.', 'instant trust.']
export const HERO_SUBTEXT = 'One link. Your client sees every update, approves deliverables, downloads files, and pays — without creating an account. You look like a studio. Not a freelancer.'
export const HERO_TRUST   = 'Free forever on 1 client · No credit card · Set up in 3 minutes'

// ── Trust Bar ─────────────────────────────────────────────────────────────────
export const TRUST_LABEL = 'Trusted by freelancers who work with teams at'
export const TRUST_LOGOS = [
  'Webflow', 'Figma', 'Shopify', 'Stripe',
  'Notion', 'Linear', 'Vercel', 'Framer', 'Loom', 'Slack',
]

// ── Stats ─────────────────────────────────────────────────────────────────────
export const STATS = [
  { target: 2400, suffix: '+',    duration: 1600, label: 'Freelancers using Freeport' },
  { target: 98,   suffix: '%',    duration: 1400, label: 'Client satisfaction rate'   },
  { target: 3,    suffix: ' min', duration: 1200, label: 'Average time to go live'    },
  { target: 180,  suffix: 'K+',  duration: 1800,  label: 'Projects delivered'         },
]

// ── Problem ───────────────────────────────────────────────────────────────────
export const PROBLEM_CARDS = [
  {
    icon: '📧',
    title: 'Endless email chains',
    desc: "'Hey, any update?' You chase clients. They chase you. Nothing is in one place. Everyone is confused.",
  },
  {
    icon: '😰',
    title: 'Clients feel left out',
    desc: "They don't know what's happening. Silence breeds doubt. Doubt leads to chargebacks and disputes.",
  },
  {
    icon: '📊',
    title: 'You look like a gig, not a studio',
    desc: "Sending files via Google Drive and updates via WhatsApp. Your work is world-class. Your process isn't.",
  },
]

// ── How It Works ──────────────────────────────────────────────────────────────
export const HOW_STEPS = [
  {
    step: '01', icon: '⚡',
    title: 'Create a project',
    desc: "Add your client's name and email. Takes 30 seconds. Freeport generates a unique magic link instantly.",
  },
  {
    step: '02', icon: '🔗',
    title: 'Share the link',
    desc: 'Copy one link and send it via email, WhatsApp, Telegram — anywhere. No logins. No accounts. No friction.',
  },
  {
    step: '03', icon: '✨',
    title: 'Your client is impressed',
    desc: 'They see a polished portal with all your updates, files, milestones, and a payment button. You look like a proper agency.',
  },
]

// ── Features ──────────────────────────────────────────────────────────────────
// previewKey must match a key in the PREVIEWS object in previews.jsx
// To add a new tab: add an object here + a matching preview component there
export const FEATURES = [
  {
    previewKey: 'portal',
    icon: '🔗', label: 'Magic Client Link',
    headline: 'One link. Everything your client needs.',
    desc: 'No logins. No app downloads. No passwords. Your client gets a private, branded portal by clicking a single link you send them.',
    bullets: ['No coding required', 'Works on every device', 'Updates in real time'],
  },
  {
    previewKey: 'updates',
    icon: '📡', label: 'Live Project Updates',
    headline: 'Keep clients in the loop, automatically.',
    desc: "Post project updates with a status. Your client sees a beautiful timeline. They stop asking 'any update?' because they already know.",
    bullets: ['Three status levels', 'Client notified by email', 'Timestamped history'],
  },
  {
    previewKey: 'milestones',
    icon: '🎯', label: 'Milestone Tracker',
    headline: 'Show progress, build trust, get paid faster.',
    desc: 'Visual milestone tracking your client can see in real time. When they watch milestones tick from Pending → Completed, they feel confident paying.',
    bullets: ['Click to update status', 'Client sees live progress', 'Linked to approvals'],
  },
  {
    previewKey: 'files',
    icon: '📦', label: 'File Delivery',
    headline: 'Deliver assets like a professional studio.',
    desc: "Upload deliverables directly to the portal. Your client downloads them with one click. No more 'I can't find the file' emails.",
    bullets: ['Cloudinary-powered storage', 'Any file type', 'Permanent links'],
  },
]

// ── Pricing ───────────────────────────────────────────────────────────────────
export const INR_RATE     = 83
export const CURRENCY     = '₹'
export const PRICING_NOTE = 'No contracts. Cancel anytime. All prices include GST.'

export const PRICING_TIERS = [
  {
    name: 'Free',
    desc: 'For freelancers just getting started. No card required.',
    monthlyPrice: 0,
    annualPrice: 0,
    highlight: false,
    ctaLabel: 'Get started free',
    ctaHref: '/signup',
    features: [
      '1 active client portal',
      'Project updates & milestones',
      'File delivery (500MB)',
      'Client approval flow',
    ],
  },
  {
    name: 'Pro',
    desc: 'For serious freelancers who want to operate like an agency.',
    monthlyPrice: 16,
    annualPrice: 12,
    highlight: true,
    badge: 'Most Popular',
    ctaLabel: 'Start Pro — free 14-day trial',
    ctaHref: '/signup?plan=pro',
    features: [
      'Everything in Free',
      'Unlimited client portals',
      'Showcase & portfolio pages',
      'Custom branding (your logo)',
      'Invoice & Stripe payments',
      'Priority support',
      'Advanced analytics',
    ],
  },
]

// ── Testimonials ──────────────────────────────────────────────────────────────
export const TESTIMONIALS = [
  {
    name: 'Priya Sharma', role: 'UI/UX Designer · Bangalore', rating: 5,
    text: "I used to send updates via WhatsApp voice notes. Now I just post on Freeport and my client sees everything in a beautiful portal. They commented that I run things 'like a real agency.'",
  },
  {
    name: 'Arjun Mehta', role: 'Full-Stack Dev · Hyderabad', rating: 5,
    text: "The magic link is genius. No more 'I can't log in' support calls. My client opened it on their phone and said it looked like a Stripe product. I charged 30% more on my next project.",
  },
  {
    name: 'Nisha Patel', role: 'Freelance Copywriter · Mumbai', rating: 5,
    text: "The milestone tracker alone is worth it. Clients can see progress in real time. I've had zero 'are you actually working on this?' emails since I started using Freeport.",
  },
  {
    name: 'Kabir Nair', role: 'Motion Designer · Pune', rating: 5,
    text: "Getting paid was always awkward. Now there's a big 'Pay Now' button right in the portal. My last three clients paid within hours of me marking the project done. Game-changing.",
  },
  {
    name: 'Divya Krishnan', role: 'Brand Consultant · Chennai', rating: 5,
    text: "I showed a client their portal on the first discovery call. Before I'd even proposed a number, they said 'this looks really professional — let's move forward.' Closed the deal that day.",
  },
  {
    name: 'Rohan Gupta', role: 'Shopify Developer · Delhi', rating: 5,
    text: "The file delivery feature is so clean. No more 'the Google Drive link expired' messages. Everything is in one portal, my client can always find it, and it reflects on my work quality.",
  },
]

// ── Final CTA ─────────────────────────────────────────────────────────────────
export const FINAL_CTA = {
  headline:       'Your next client call starts with',
  headlineAccent: 'this link.',
  subtext:        'Set up your first client portal in 3 minutes. Free forever. No credit card. No excuses.',
  ctaLabel:       "Create my client portal — it's free →",
  trustBullets:   ['No credit card', 'Free forever plan', 'Set up in 3 min'],
}

// ── Footer ────────────────────────────────────────────────────────────────────
export const FOOTER_TAGLINE   = 'The client portal for freelancers who want to look and work like studios.'
export const FOOTER_COPYRIGHT = '© 2025 Freeport. Built for freelancers who mean business.'
export const FOOTER_MADE_IN   = 'Made with ♥ in India'

export const FOOTER_LINKS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features',  href: '#features'  },
      { label: 'Pricing',   href: '#pricing'   },
      { label: 'Changelog', href: '/changelog' },
      { label: 'Roadmap',   href: '/roadmap'   },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About',   href: '/about'   },
      { label: 'Blog',    href: '/blog'    },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy',       href: '/privacy' },
      { label: 'Terms',         href: '/terms'   },
      { label: 'Cookie Policy', href: '/cookies' },
    ],
  },
]