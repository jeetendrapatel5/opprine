'use client'

// components/landing/Problem.jsx

import {
  Activity,
  CheckCircle2,
  Code2,
  CreditCard,
  Eye,
  FileCheck2,
  FileText,
  LayoutDashboard,
  Link2,
  LockKeyhole,
  ShieldCheck,
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
import { CARD, DiffMarker, MUTED_TEXT, PAGE_MAX, SectionHeader, SectionHeading, SectionLabel, WindowChrome } from './ui'

const stepIcons = [LayoutDashboard, Link2, FileCheck2, CreditCard]

const featureIcons = {
  code: Code2,
  link: Link2,
  layout: LayoutDashboard,
  file: FileText,
  check: CheckCircle2,
  activity: Activity,
  credit: CreditCard,
  shield: ShieldCheck,
}

export function Problem() {
  return (
    <section className="py-20 sm:py-28">
      <div className={`${PAGE_MAX} grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start`}>
        <SectionHeader title={PAIN_HEADER} align="left" className="lg:sticky lg:top-28">
          {PAIN_INTRO}
        </SectionHeader>

        <div className="stagger grid gap-4 sm:grid-cols-2">
          {PAIN_CARDS.map(({ id, open, body, sting }) => (
            <article
              key={id}
              className={`${CARD} p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#D9D1C3] sm:p-6`}
            >
              <DiffMarker kind="minus" className="h-9 w-9 rounded-lg [&>svg]:h-4 [&>svg]:w-4" />
              <h3 className="mt-5 text-[15.5px] font-semibold leading-6 text-[#17130F]">{open}</h3>
              <p className={`mt-3 text-[13px] leading-6 ${MUTED_TEXT}`}>{body}</p>
              {sting ? (
                <p className="mt-5 border-t border-[#E7E0D3] pt-4 text-[12px] font-semibold leading-5 text-[#9A3A2A]">
                  {sting}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Reframe() {
  const [line1, line2] = REFRAME_BODY.split('\n\n')

  return (
    <section className="border-y border-[#E7E0D3] bg-[#17130F] py-20 sm:py-28">
      <div className={`${PAGE_MAX} grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center`}>
        <div className="reveal">
          <SectionHeading tone="invert" className="mt-4">
            {REFRAME_LABEL}
          </SectionHeading>
          <p className="mt-6 text-[15px] leading-8 text-white/60">{line1}</p>
          <p className="mt-4 text-[15px] font-medium leading-8 text-white">{line2}</p>
        </div>

        <div className="stagger grid gap-3">
          {TRUST_SIGNALS.map(({ title, desc }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-start gap-4">
                <DiffMarker kind="plus" className="h-9 w-9 shrink-0 rounded-lg [&>svg]:h-4 [&>svg]:w-4" />
                <div>
                  <h3 className="text-[14px] font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-white/55">{desc}</p>
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
    <section id="workflow" className="py-20 sm:py-28">
      <div className={PAGE_MAX}>
        <SectionHeader title={HOW_HEADER} className="mx-auto max-w-3xl" />

        <div className="stagger mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {HOW_STEPS.map(({ step, title, desc, result }, index) => {
            const Icon = stepIcons[index] || LayoutDashboard

            return (
              <article key={step} className={`${CARD} relative overflow-hidden p-5 sm:p-6`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[26px] font-semibold text-[#17130F]/[0.08]">{step}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E7E0D3] bg-[#F4EEE4] text-[#17130F]">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                </div>
                <h3 className="mt-7 text-[16px] font-semibold leading-6 text-[#17130F]">{title}</h3>
                <p className={`mt-3 text-[13px] leading-6 ${MUTED_TEXT}`}>{desc}</p>
                <p className="mt-5 border-t border-[#E7E0D3] pt-4 text-[12px] font-semibold leading-5 text-[#1E6F45]">
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
    <section id="features" className="border-y border-[#E7E0D3] bg-[#F4EEE4]/60 py-20 sm:py-28">
      <div className={PAGE_MAX}>
        <div className="grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <SectionHeader title={FEATURES_HEADER} align="left" className="lg:sticky lg:top-28">
            Private portals, structured handoffs, approvals, activity, and invoice context without turning your client into a software user.
          </SectionHeader>

          <div className="stagger grid gap-4 sm:grid-cols-2">
            {FEATURES.map(({ icon, name, desc, detail }) => {
              const Icon = featureIcons[icon] || FileText

              return (
                <article key={name} className="rounded-2xl border border-[#E7E0D3] bg-white p-5 sm:p-6">
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg border border-[#E7E0D3] bg-[#F4EEE4] text-[#17130F]">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <h3 className="text-[15px] font-semibold leading-6 text-[#17130F]">{name}</h3>
                  <p className={`mt-3 text-[13px] leading-6 ${MUTED_TEXT}`}>{desc}</p>
                  <p className="mt-5 border-t border-[#E7E0D3] pt-4 text-[12px] font-medium leading-5 text-[#948C7E]">
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
    <section className="py-20 sm:py-28">
      <div className={PAGE_MAX}>
        <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div className="reveal">
            <h2 className="mt-4 font-display text-3xl font-semibold leading-[1.1] text-[#17130F] sm:text-4xl lg:text-[2.75rem]">
              The portal turns progress into a premium client experience.
            </h2>
            <p className={`mt-6 text-[15px] leading-8 ${MUTED_TEXT}`}>
              Clients do not need a project-management tool. They need clarity. What changed, what needs review, what
              is approved, what files are ready, and what happens next.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { icon: Eye, label: 'Viewed today', value: '2:14 PM' },
                { icon: FileCheck2, label: 'Open approval', value: 'Homepage' },
                { icon: LockKeyhole, label: 'Access', value: 'Private link' },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-xl border border-[#E7E0D3] bg-white p-3"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#17130F] text-white">
                    <Icon aria-hidden="true" className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-[12px] font-medium text-[#948C7E]">{label}</p>
                    <p className="text-[13px] font-semibold text-[#17130F]">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`reveal ${CARD} overflow-hidden`}>
            <WindowChrome url="opprine.com/dashboard/projects/luminary" />

            <div className="p-5 sm:p-6">
              <div className="border-b border-[#E7E0D3] pb-5">
                <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-[#948C7E]">
                  Rahul&apos;s project
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-[#17130F]">Luminary Co. Website</h3>
                    <p className={`mt-2 text-[13px] ${MUTED_TEXT}`}>Brand site build, CMS setup, launch support</p>
                  </div>
                  <span className="w-fit rounded-lg bg-[#17130F] px-3 py-2 text-[12px] font-semibold text-white">
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
                  <div key={label} className="rounded-xl border border-[#E7E0D3] bg-[#F4EEE4]/60 p-4">
                    <p className="text-[12px] font-medium text-[#948C7E]">{label}</p>
                    <p className="mt-2 font-display text-xl font-semibold text-[#17130F]">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-[#E7E0D3] bg-[#F4EEE4]/60 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-[#948C7E]">
                      Ready for review
                    </p>
                    <h4 className="mt-2 text-[16px] font-semibold text-[#17130F]">Homepage development</h4>
                    <p className={`mt-2 max-w-xl text-[13px] leading-6 ${MUTED_TEXT}`}>
                      The final homepage build is ready with responsive polish, CMS wiring, and performance pass
                      complete.
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-[#D9D1C3] bg-white px-3 py-2 text-[12px] font-semibold text-[#17130F]"
                    >
                      Changes
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-[#17130F] px-3 py-2 text-[12px] font-semibold text-white"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#E7E0D3] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E9F4EC] text-[#1E6F45]">
                    <CreditCard aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-[#17130F]">Final invoice</p>
                    <p className={`text-[12px] ${MUTED_TEXT}`}>Ready after approval</p>
                  </div>
                </div>
                <p className="font-display text-xl font-semibold text-[#17130F]">$1,740</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}