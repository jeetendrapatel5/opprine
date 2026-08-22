'use client'

// components/landing/Hero.jsx

import { ArrowRight, CreditCard, GitCommit, Link2 } from 'lucide-react'
import {
  HERO_CTA,
  HERO_HEADLINE,
  HERO_METRICS,
  HERO_SECONDARY_CTA,
  HERO_SUB,
  HERO_TRUST,
} from './data'
import { CARD, DiffMarker, MUTED_TEXT, PAGE_MAX, PrimaryButton, SecondaryButton, SectionLabel, WindowChrome } from './ui'

// Illustrative commit history — the raw material the client update on the
// right is built from. This is the page's one signature moment: showing the
// literal translation the product performs, rather than a generic dashboard.
const COMMITS = [
  { hash: 'a3f9c2', msg: 'feat: responsive hero layout' },
  { hash: 'd81e4b', msg: 'fix: contact form validation' },
  { hash: '9c22f1', msg: 'feat: CMS wiring for homepage' },
  { hash: '741ab0', msg: 'chore: performance pass' },
]

function CommitToUpdate() {
  return (
    <div className="reveal mx-auto mt-14 hidden max-w-5xl md:block">
      <div className={`${CARD} overflow-hidden`}>
        <WindowChrome url="opprine.com/dashboard/projects/luminary-website" />

        <div className="grid lg:grid-cols-[1fr_auto_1fr]">
          {/* Raw material: the commit log */}
          <div className="bg-[#17130F] p-6 sm:p-7">
            <div className="flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-white/40">
              <GitCommit aria-hidden="true" className="h-3.5 w-3.5" />
              git log --oneline
            </div>
            <div className="mt-6 space-y-4 font-mono text-[12.5px] leading-5">
              {COMMITS.map((c) => (
                <div key={c.hash} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4FBE84]" />
                  <p>
                    <span className="text-[#4FBE84]">{c.hash}</span>{' '}
                    <span className="text-white/65">{c.msg}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* The translation */}
          <div className="flex items-center justify-center border-y border-[#E7E0D3] bg-[#F4EEE4] py-5 lg:border-y-0 lg:border-x lg:px-6 lg:py-0">
            <div className="flex flex-col items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E7E0D3] bg-white">
                <ArrowRight aria-hidden="true" className="h-4 w-4 rotate-90 text-[#1E6F45] lg:rotate-0" />
              </span>
              <span className="max-w-[70px] text-center font-mono text-[10px] font-semibold uppercase leading-tight tracking-[0.1em] text-[#948C7E] lg:max-w-none">
                Opprine translates
              </span>
            </div>
          </div>

          {/* What the client sees */}
          <div className="p-6 sm:p-7">
            <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-[#948C7E]">
              Client view
            </p>
            <h3 className="mt-2.5 font-display text-lg font-semibold leading-snug text-[#17130F] sm:text-xl">
              Homepage build is ready for review
            </h3>
            <p className={`mt-2 text-[13px] leading-6 ${MUTED_TEXT}`}>
              Responsive layout, CMS wiring, and the updated contact form — all shipped since Monday.
            </p>

            <div className="mt-5 h-1.5 rounded-full bg-[#F4EEE4]">
              <div className="h-1.5 w-[72%] rounded-full bg-[#1E6F45]" />
            </div>
            <p className="mt-2 text-[11px] font-medium text-[#948C7E]">3 of 4 milestones complete</p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg border border-[#D9D1C3] px-3 py-2 text-[12px] font-semibold text-[#17130F] transition-colors hover:bg-[#F4EEE4]"
              >
                Request changes
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg bg-[#17130F] px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#2A241C]"
              >
                Approve
              </button>
            </div>

            <div className="mt-5 flex items-center gap-2 border-t border-[#E7E0D3] pt-4 text-[12px] font-semibold text-[#17130F]">
              <CreditCard aria-hidden="true" className="h-4 w-4 text-[#1E6F45]" />
              Invoice ready after approval
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Hero({ onCTA }) {
  const [lead, ...rest] = HERO_HEADLINE.split('. ')
  const closer = rest.join('. ')

  return (
    <section id="product" className="px-0 pb-16 pt-32 sm:pt-36 lg:pb-24 lg:pt-40">
      <div className={PAGE_MAX}>
        <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
          <h1 className="reveal mt-4 font-display text-[2rem] font-semibold leading-[1.08] tracking-[-0.015em] text-[#17130F] sm:text-5xl lg:text-[3.4rem]">
            {lead}
            {closer ? '. ' : null}
            <span className="text-[#1E6F45]">{closer}</span>
          </h1>

          <p className={`reveal mt-6 max-w-2xl text-[0.98rem] leading-7 sm:text-lg sm:leading-8 ${MUTED_TEXT}`}>
            {HERO_SUB}
          </p>

          <div className="reveal mt-9 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
            <PrimaryButton onClick={onCTA} className="px-5">
              {HERO_CTA}
            </PrimaryButton>
            <SecondaryButton href="#workflow">
              <Link2 aria-hidden="true" className="h-4 w-4" />
              {HERO_SECONDARY_CTA}
            </SecondaryButton>
          </div>

          <div className="reveal mt-8 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-2">
            {HERO_TRUST.map((item) => (
              <div key={item} className="flex items-center gap-2 text-[12.5px] font-medium text-[#17130F]/80">
                <DiffMarker kind="plus" className="h-4 w-4 rounded bg-transparent [&>svg]:h-2.5 [&>svg]:w-2.5" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <CommitToUpdate />

        <div className="stagger mx-auto mt-10 grid max-w-3xl grid-cols-1 divide-y divide-[#E7E0D3] overflow-hidden rounded-2xl border border-[#E7E0D3] bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {HERO_METRICS.map(({ value, label }) => (
            <div key={label} className="px-5 py-5 text-center">
              <p className="font-display text-2xl font-semibold text-[#17130F]">{value}</p>
              <p className="mt-1 text-[12px] font-medium text-[#948C7E]">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}