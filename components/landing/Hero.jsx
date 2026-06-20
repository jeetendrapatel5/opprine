'use client'

// components/landing/Hero.jsx

import {
  CheckCircle2,
  Clock3,
  CreditCard,
  FileCheck2,
  FileText,
  Link2,
  MessageSquareText,
  ShieldCheck,
} from 'lucide-react'
import {
  HERO_CTA,
  HERO_HEADLINE,
  HERO_METRICS,
  HERO_PRE,
  HERO_SECONDARY_CTA,
  HERO_SUB,
  HERO_TRUST,
} from './data'
import { MUTED_TEXT, PAGE_MAX, PrimaryButton, SecondaryButton, WindowChrome } from './ui'

const timeline = [
  { label: 'Discovery notes uploaded', meta: 'Approved May 28', done: true },
  { label: 'Homepage build ready', meta: 'Awaiting client review', active: true },
  { label: 'Final QA and handoff', meta: 'Scheduled Friday', done: false },
]


function PortalPreview() {
  return (
    <div className="reveals mx-auto mt-4 max-w-6xl sm:mt-10 lg:mt-14 hidden md:flex">

      {/* The outer border/shadow card — overflow-hidden already protects inner content */}
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-950">

        {/* WindowChrome stays exactly the same */}
        <WindowChrome url="opprine.com/dashboard/projects/luminary-website" />

        {/*
          Main 2-column grid.
          - On mobile: 1 column, sidebar sits on top of main content.
          - On lg (1024px+): sidebar 286px | main content fills rest.
          This was already fine — no change needed here.
        */}
        <div className="grid bg-white dark:bg-neutral-950 lg:grid-cols-[286px_1fr]">

          {/* ─── SIDEBAR ─────────────────────────────────────── */}
          <aside className="border-b border-neutral-200 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03] lg:border-b-0 lg:border-r lg:p-5">

            {/* Project header row — same on all screens */}
            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-950 text-white dark:bg-white dark:text-neutral-950">
                <FileText aria-hidden="true" className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-neutral-950 dark:text-white">
                  Luminary Website
                </p>
                <p className={`text-[12px] ${MUTED_TEXT}`}>Opprine</p>
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:mt-6 lg:flex-col lg:gap-0 lg:space-y-2 lg:overflow-x-visible lg:pb-0">
              {[
                { icon: Clock3, label: 'Progress', active: true },
                { icon: FileCheck2, label: 'Approvals' },
                { icon: CreditCard, label: 'Invoice' },
                { icon: MessageSquareText, label: 'Feedback' },
              ].map(({ icon: Icon, label, active }) => (
                <div
                  key={label}
                  className={`
                    flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold
                    shrink-0 whitespace-nowrap
                    lg:gap-3 lg:py-2.5
                    ${active
                      ? 'bg-white text-neutral-950 shadow-sm dark:bg-white/[0.08] dark:text-white'
                      : 'text-neutral-500 dark:text-neutral-400'
                    }
                  `}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {label}
                </div>
              ))}
            </div>

            <div className="mt-8 hidden rounded-lg border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-neutral-950 lg:block">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-neutral-950 dark:text-white">
                <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                Secure handoff
              </div>
              <p className={`mt-2 text-[12px] leading-5 ${MUTED_TEXT}`}>
                Private project link, structured approvals, and client-ready payment context.
              </p>
            </div>
          </aside>

          <div className="p-4 sm:p-5 lg:p-7">

            {/* ── Header section ── */}
            <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 dark:border-white/10 md:flex-row md:items-start md:justify-between md:gap-5 md:pb-6">

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                  Client view
                </p>

                <h2 className="mt-2 font-display text-xl font-semibold leading-tight text-neutral-950 sm:text-2xl lg:text-3xl dark:text-white">
                  Homepage build is ready for review
                </h2>
                <p className={`mt-3 max-w-xl text-[14px] leading-6 ${MUTED_TEXT}`}>
                  The client sees the current milestone, recent files, approval controls,
                  and invoice status in one place.
                </p>
              </div>

              {/* Project health card — already w-full on mobile, w-[220px] on md. No change needed. */}
              <div className="w-full shrink-0 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-white/10 dark:bg-white/[0.04] md:w-[220px]">

                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-semibold text-neutral-950 dark:text-white">Project health</span>
                  <span className="rounded-md bg-neutral-950 px-2 py-1 text-[11px] font-semibold text-white dark:bg-white dark:text-neutral-950">
                    On track
                  </span>
                </div>
                <div className="mt-4 h-2 rounded-full bg-neutral-200 dark:bg-white/10">
                  <div className="h-2 w-[72%] rounded-full bg-neutral-950 dark:bg-white" />
                </div>
                <p className={`mt-2 text-[12px] ${MUTED_TEXT}`}>3 of 4 milestones complete</p>
              </div>
            </div>

            {/* ── Bottom: Timeline + Decision panel ── */}
            <div className="grid gap-4 pt-5 lg:gap-5 lg:grid-cols-[1fr_280px] lg:pt-6">

              {/* Timeline */}
              <div className="space-y-4">
                {timeline.map((item, index) => (
                  <div key={item.label} className="flex gap-3 lg:gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${item.done
                            ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950'
                            : item.active
                              ? 'border-neutral-950 bg-white text-neutral-950 dark:border-white dark:bg-neutral-950 dark:text-white'
                              : 'border-neutral-300 bg-white text-neutral-400 dark:border-white/20 dark:bg-neutral-950'
                          }`}
                      >
                        {item.done ? <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> : null}
                      </span>
                      {index < timeline.length - 1 ? (
                        <span className="mt-2 h-12 w-px bg-neutral-200 dark:bg-white/10" />
                      ) : null}
                    </div>

                    <div className="min-w-0 pb-2">
                      <p className="text-[14px] font-semibold text-neutral-950 dark:text-white">
                        {item.label}
                      </p>
                      <p className={`mt-1 text-[12px] ${MUTED_TEXT}`}>{item.meta}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Decision panel — no structural changes needed */}
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                  Decision needed
                </p>
                <h3 className="mt-3 text-[15px] font-semibold leading-6 text-neutral-950 dark:text-white">
                  Approve the homepage build
                </h3>
                <p className={`mt-2 text-[12px] leading-5 ${MUTED_TEXT}`}>
                  Includes responsive layout, CMS wiring, and the updated contact form.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-[12px] font-semibold text-neutral-700 dark:border-white/15 dark:bg-neutral-950 dark:text-neutral-300"
                  >
                    Request changes
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-neutral-950 px-3 py-2 text-[12px] font-semibold text-white dark:bg-white dark:text-neutral-950"
                  >
                    Approve
                  </button>
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-neutral-200 pt-4 text-[12px] font-semibold text-neutral-950 dark:border-white/10 dark:text-white">
                  <CreditCard aria-hidden="true" className="h-4 w-4" />
                  Invoice ready after approval
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Hero({ onCTA }) {
  return (
    <section id="product" className="px-0 pb-16 pt-28 sm:pt-32 lg:pb-20 lg:pt-36">
      <div className={PAGE_MAX}>
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <h1 className="reveals mt-6 font-display text-[2rem] font-semibold leading-[0.98] text-neutral-950 sm:text-5xl lg:text-6xl xl:text-7xl dark:text-white">
            {HERO_HEADLINE}
          </h1>

          <p className={`reveals mt-6 max-w-2xl text-[0.953rem]  sm:text-lg ${MUTED_TEXT}`}>
            {HERO_SUB}
          </p>

          <div className="reveal mt-8 flex items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
            <PrimaryButton onClick={onCTA} className="px-4">
              {HERO_CTA}
            </PrimaryButton>
            <SecondaryButton href="#workflow">
              <Link2 aria-hidden="true" className="h-4 w-4" />
              {HERO_SECONDARY_CTA}
            </SecondaryButton>
          </div>

          <div className="reveal mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {HERO_TRUST.map((item) => (
              <div key={item} className={`flex items-center gap-2 text-[12px] font-semibold ${MUTED_TEXT}`}>
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-neutral-950 dark:text-white" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <PortalPreview />

        <div className="stagger mx-auto mt-6 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3">
          {HERO_METRICS.map(({ value, label }) => (
            <div
              key={label}
              className="rounded-lg bg-white/70 px-5 py-4 text-center dark:border-white/10 dark:bg-white/[0.03]"
            >
              <p className="font-[poppins] text-2xl font-semibold text-neutral-950 dark:text-white">{value}</p>
              <p className={`mt-1 text-[12px] font-medium ${MUTED_TEXT}`}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
