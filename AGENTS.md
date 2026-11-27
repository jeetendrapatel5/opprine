# AGENTS.md — Opprine

If anything here disagrees with the code, the code wins. Tell me about the difference.

## Me
Jeetu, solo self-taught developer. No team, no reviewer. Your care is the only safety net.

## How to work with me
1. Use very simple language. Explain step by step: what each file, function and module does, and how data flows (UI → API route → lib → Prisma → UI).
2. Correct me when I am wrong. Do not just agree. Say it kindly, then follow my decision.
3. Give complete file replacements, not diffs. List every changed file at the end.
4. Match existing code, components and conventions. No new dependency without asking.
5. If I say "phase by phase", do one phase per reply and wait for `CONTINUE`.
6. Never break existing behaviour, permissions or API contracts unless I ask.
7. Say clearly what you did not run or verify.

## Product
Opprine (working name Freeport): B2B SaaS for freelance web developers and small web agencies to run client delivery.
Flow: team work → project progress → client communication → deliverables → client approval → payment → case study.
Should feel like a premium, credible platform, not a cheap freelancer tool.
Status: solo, pre-revenue, no paying customer, **no registered company**. Avoid anything that needs paid plans, monthly fees or business registration.

## Stack
Next.js (App Router), React, JS and TS mixed (follow the file you edit), PostgreSQL on Supabase, Prisma (Prisma Migrate), NextAuth v4, Resend, Razorpay, Stripe, Cloudinary, Gemini, Tailwind, shadcn/ui, `fp-*` tokens in `app/globals.css`.
Hosting: Vercel. CI: GitHub Actions (`.github/workflows/ci.yml`, "Lint, typecheck and build"). Repo: github.com/jeetendrapatel5/opprine.
See `package.json` for scripts.

## Security rules (most important)
- Scope every query by `workspaceId`, never only `userId`.
- Never trust IDs from URL or body. Check the record belongs to the caller's workspace and that the caller has permission on that exact project, milestone or invoice (prevent BOLA/IDOR).
- Use the central permission matrix `can()` in `lib/project-permissions.js`. No ad-hoc role checks.
- Enforce permissions in the API, not only in the UI.
- Workspace members see every project in the list but open only projects they are assigned to. Unassigned open shows an access-restricted state, not a 404.
- Only Workspace Owner and Project Manager can add/remove project members or set roles. Contributors can only view names and roles.
- Client portal uses magic links. Treat it as public and untrusted. Never leak `INTERNAL` data, internal notes or bank details to clients.
- Bank account numbers are stored encrypted. Never log or expose them. No secrets in code or logs.

## Engineering rules
- Plans and limits come only from `lib/billing/plans.js`.
- Schema change = new Prisma migration. Never edit an applied migration. Remind me to run `prisma migrate deploy` on production with the deploy (a missing column once caused a P2022 signup error).
- Write a change and its activity event (`ProjectActivity`, append-only) in one transaction.
- UI: only existing `fp-*` tokens, no new colours or hex values. Accessible, responsive, clickable rows show a pointer cursor.
- Short, purposeful comments only.
- Before saying done: lint, typecheck, build and tests must pass. Add tests for logic you change.

## Before each task
1. Read the relevant files fully. Do not guess their contents.
2. Trace the data flow and check who is allowed to do this.
3. Tell me your plan in simple words, then work.
4. End with: files changed, how to verify, migrations to run, risks noticed.
If a missing answer changes the design, ask one focused question. Otherwise state your assumption and continue.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
