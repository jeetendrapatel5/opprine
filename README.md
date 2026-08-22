# Opprine

**Client delivery and project management, built for web studios and freelancers.**

Opprine gives web development studios and freelancers a shared portal to run client projects — tracking milestones, surfacing real progress straight from Git, and giving both sides a clear, timestamped record of who's actually holding things up.

---

## Why Opprine

Freelancers and small studios lose time (and money) to two recurring problems:

- **"What's the actual status?"** — Clients don't read Slack updates or standups, so progress becomes invisible until a deadline is missed.
- **"Who caused the delay?"** — When a project slips, it's often because the client sat on feedback, assets, or approvals — but there's rarely a clean record proving that.

Opprine solves both by turning your existing Git activity into client-readable updates, and by automatically logging when a project is blocked on the client rather than on you.

---

## Key Features

- **Git-native progress tracking** — A GitHub webhook (HMAC-SHA256 verified) picks up commits automatically and uses Gemini to turn them into plain-English updates clients can actually understand — no manual status reports.
- **Blocked-On-Client Ledger** — Automatically timestamps and logs periods where a project is stalled waiting on the client (feedback, approvals, assets), so delays are never ambiguous.
- **Milestone management** — Drag-and-drop milestone reordering and tracking, tied to real project timelines.
- **Multi-tenant workspaces** — Free / Pro / Team / Enterprise plans, with Razorpay-powered subscription billing, webhook-driven plan enforcement, and server-side feature gating.
- **Magic-link authentication** — Passwordless sign-in via NextAuth for both studio owners and their clients.
- **Client file delivery** — Deliverables and assets handled through Cloudinary.
- **Automated email flows** — Transactional and notification emails via Resend.
- **Non-custodial invoicing** — Invoicing built for multi-freelancer teams without acting as an unlicensed payment aggregator.
- **Decision Map** — A visual annotation layer for capturing client decisions and feedback in context.
- **Public showcase pages** — Studios can publish a public, portfolio-style view of completed projects.

---

## Tech Stack

- **Framework:** Next.js (App Router), React
- **Styling:** Tailwind CSS, shadcn/ui
- **Database / ORM:** PostgreSQL, Prisma
- **Auth:** NextAuth
- **Payments:** Stripe, Razorpay
- **AI:** Gemini
- **File storage:** Cloudinary
- **Email:** Resend

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or hosted, e.g. Neon/Supabase)
- npm, pnpm, or yarn

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/opprine.git
cd opprine

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# then fill in the values — see table below

# 4. Run database migrations
npx prisma migrate dev

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view it locally.

---

## Environment Variables

> ⚠️ These are inferred from the stack, not pulled from your actual `.env` file — double-check names and add any that are missing before relying on this table.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | NextAuth session encryption secret |
| `NEXTAUTH_URL` | App base URL for auth callbacks |
| `GITHUB_WEBHOOK_SECRET` | Verifies incoming GitHub webhook signatures (HMAC-SHA256) |
| `GEMINI_API_KEY` | Commit summarization |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Subscription billing |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Invoicing |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | File delivery |
| `RESEND_API_KEY` | Transactional email |

---

## Project Structure

```
opprine/
├── app/            # Next.js App Router pages and routes
├── components/     # Shared UI components (shadcn/ui-based)
├── lib/            # Server utilities, integrations (Prisma, webhooks, Gemini, etc.)
├── prisma/         # Database schema and migrations
└── public/         # Static assets
```

---

## Scripts

```bash
npm run dev       # Start local dev server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run linter
npx prisma studio # Browse the database visually
```

---

## Deployment

Deployed on [Vercel](https://vercel.com). Push to `main` to trigger a production deploy; make sure all environment variables above are set in the Vercel project settings first.

---

## License

All rights reserved. This is proprietary software — not licensed for reuse or redistribution.