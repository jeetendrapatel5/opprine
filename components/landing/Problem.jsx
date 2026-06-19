'use client'

// components/landing/Problem.jsx

import {
  Activity,
  CheckCircle2,
  CreditCard,
  Eye,
  FileCheck2,
  FileText,
  LayoutDashboard,
  Link2,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react'
import {
  FEATURES,
  FEATURES_HEADER,
  HOW_HEADER,
  HOW_STEPS,
  PAIN_CARDS,
  PAIN_HEADER,
  PAIN_INTRO,
  REFRAME_BODY,
  REFRAME_LABEL,
  TRUST_SIGNALS,
} from './data'
import { CARD, MUTED_TEXT, PAGE_MAX, SectionHeader, SectionLabel, WindowChrome } from './ui'

const painIcons = {
  updates: MessageSquareText,
  approval: CheckCircle2,
  files: UploadCloud,
  payment: CreditCard,
}

const stepIcons = [LayoutDashboard, Link2, FileCheck2, CreditCard]

const featureIcons = {
  link: Link2,
  layout: LayoutDashboard,
  file: FileText,
  check: CheckCircle2,
  activity: Activity,
  credit: CreditCard,
}

export function Problem() {
  return (
    <section className="py-20 sm:py-24">
      <div className={`${PAGE_MAX} grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start`}>
        <SectionHeader label="The client gap" title={PAIN_HEADER} align="left" className="lg:sticky lg:top-28">
          {PAIN_INTRO}
        </SectionHeader>

        <div className="stagger grid gap-4 sm:grid-cols-2">
          {PAIN_CARDS.map(({ id, open, body, sting }) => {
            const Icon = painIcons[id] || MessageSquareText

            return (
              <article key={id} className={`${CARD} p-5 transition duration-200 hover:-translate-y-0.5 hover:border-neutral-300 dark:hover:border-white/20`}>
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-950 text-white dark:bg-white dark:text-neutral-950">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </div>
                <h3 className="text-[16px] font-semibold leading-6 text-neutral-950 dark:text-white">{open}</h3>
                <p className={`mt-3 text-[13px] leading-6 ${MUTED_TEXT}`}>{body}</p>
                {sting ? (
                  <p className="mt-5 border-t border-neutral-200 pt-4 text-[12px] font-semibold leading-5 text-neutral-950 dark:border-white/10 dark:text-white">
                    {sting}
                  </p>
                ) : null}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function Reframe() {
  const [line1, line2] = REFRAME_BODY.split('\n\n')

  return (
    <section className="border-y border-neutral-200 bg-neutral-950 py-20 text-white dark:border-white/10 dark:bg-white dark:text-neutral-950 sm:py-24">
      <div className={`${PAGE_MAX} grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center`}>
        <div className="reveal">
          <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500">
            The operating layer
          </span>
          <h2 className="font-display text-3xl font-semibold leading-[1.08] sm:text-4xl lg:text-5xl">
            {REFRAME_LABEL}
          </h2>
          <p className="mt-6 text-[15px] leading-8 text-neutral-300 dark:text-neutral-700">{line1}</p>
          <p className="mt-4 text-[15px] font-medium leading-8 text-white dark:text-neutral-950">{line2}</p>
        </div>

        <div className="stagger grid gap-3">
          {TRUST_SIGNALS.map(({ title, desc }) => (
            <div
              key={title}
              className="rounded-lg border border-white/3 bg-white/[0.04] p-5 dark:border-neutral-200 dark:bg-neutral-50"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-neutral-950 dark:bg-neutral-950 dark:text-white">
                  <ShieldCheck aria-hidden="true" className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="text-[14px] font-semibold">{title}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-neutral-300 dark:text-neutral-600">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function HowItWorks() {
  return (
    <section id="workflow" className="py-20 sm:py-24">
      <div className={PAGE_MAX}>
        <SectionHeader label="Workflow" title={HOW_HEADER} className="mx-auto max-w-3xl" />

        <div className="stagger mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {HOW_STEPS.map(({ step, title, desc, result }, index) => {
            const Icon = stepIcons[index] || LayoutDashboard

            return (
              <article key={step} className={`${CARD} relative overflow-hidden p-5`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[22px] font-semibold text-neutral-300/60 dark:text-neutral-400">
                    {step}
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
                    <Icon aria-hidden="true" className="h-4.5 w-4.5" />
                  </span>
                </div>
                <h3 className="mt-8 text-[17px] font-semibold leading-6 text-neutral-950 dark:text-white">{title}</h3>
                <p className={`mt-3 text-[13px] leading-6 ${MUTED_TEXT}`}>{desc}</p>
                <p className="mt-5 border-t border-neutral-200 pt-4 text-[12px] font-semibold leading-5 text-neutral-950 dark:border-white/10 dark:text-white">
                  {result}
                </p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function Features() {
  return (
    <section id="features" className="border-y border-neutral-200 bg-neutral-50/70 py-20 dark:border-white/10 dark:bg-white/[0.03] sm:py-24">
      <div className={PAGE_MAX}>
        <div className="grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <SectionHeader label="Features" title={FEATURES_HEADER} align="left" className="lg:sticky lg:top-28">
            Private portals, structured handoffs, approvals, activity, and invoice context without turning your client into a software user.
          </SectionHeader>

          <div className="stagger grid gap-4 sm:grid-cols-2">
            {FEATURES.map(({ icon, name, desc, detail }) => {
              const Icon = featureIcons[icon] || FileText

              return (
                <article key={name} className={`${CARD} bg-white p-5 dark:bg-neutral-950/40`}>
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <h3 className="text-[15px] font-semibold leading-6 text-neutral-950 dark:text-white">{name}</h3>
                  <p className={`mt-3 text-[13px] leading-6 ${MUTED_TEXT}`}>{desc}</p>
                  <p className="mt-5 border-t border-neutral-200 pt-4 text-[12px] font-medium leading-5 text-neutral-500 dark:border-white/10 dark:text-neutral-400">
                    {detail}
                  </p>
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export function PortalMoment() {
  return (
    <section className="py-20 sm:py-24">
      <div className={PAGE_MAX}>
        <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div className="reveal">
            <SectionLabel>The client view</SectionLabel>
            <h2 className="font-display text-3xl font-semibold leading-[1.08] text-neutral-950 sm:text-4xl lg:text-5xl dark:text-white">
              The portal turns progress into a premium client experience.
            </h2>
            <p className={`mt-6 text-[15px] leading-8 ${MUTED_TEXT}`}>
              Clients do not need a project-management tool. They need clarity. What changed, what needs review, what is approved, what files are ready, and what happens next.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { icon: Eye, label: 'Viewed today', value: '2:14 PM' },
                { icon: FileCheck2, label: 'Open approval', value: 'Homepage' },
                { icon: LockKeyhole, label: 'Access', value: 'Private link' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-950 text-white dark:bg-white dark:text-neutral-950">
                    <Icon aria-hidden="true" className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-[12px] font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
                    <p className="text-[13px] font-semibold text-neutral-950 dark:text-white">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="reveal overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-950">
            <WindowChrome url="opprine.com/dashboard/projects/luminary" />

            <div className="p-5 sm:p-6">
              <div className="border-b border-neutral-200 pb-5 dark:border-white/10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
                  Rahul&apos;s project
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-neutral-950 dark:text-white">
                      Luminary Co. Website
                    </h3>
                    <p className={`mt-2 text-[13px] ${MUTED_TEXT}`}>Brand site build, CMS setup, launch support</p>
                  </div>
                  <span className="w-fit rounded-lg bg-neutral-950 px-3 py-2 text-[12px] font-semibold text-white dark:bg-white dark:text-neutral-950">
                    On track
                  </span>
                </div>
              </div>

              <div className="grid gap-4 pt-5 sm:grid-cols-3">
                {[
                  { label: 'Milestones', value: '3 / 4' },
                  { label: 'Files ready', value: '12' },
                  { label: 'Invoice', value: 'Pending' },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <p className="text-[12px] font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
                    <p className="mt-2 font-sans text-xl font-semibold text-neutral-950 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                      Ready for review
                    </p>
                    <h4 className="mt-2 text-[16px] font-semibold text-neutral-950 dark:text-white">
                      Homepage development
                    </h4>
                    <p className={`mt-2 max-w-xl text-[13px] leading-6 ${MUTED_TEXT}`}>
                      The final homepage build is ready with responsive polish, CMS wiring, and performance pass complete.
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-[12px] font-semibold text-neutral-700 dark:border-white/15 dark:bg-neutral-950 dark:text-neutral-300"
                    >
                      Changes
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-neutral-950 px-3 py-2 text-[12px] font-semibold text-white dark:bg-white dark:text-neutral-950"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-neutral-950 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-950 text-white dark:bg-white dark:text-neutral-950">
                    <CreditCard aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-neutral-950 dark:text-white">Final invoice</p>
                    <p className={`text-[12px] ${MUTED_TEXT}`}>Ready after approval</p>
                  </div>
                </div>
                <p className="font-sans text-xl font-semibold text-neutral-950 dark:text-white">$1,740</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
