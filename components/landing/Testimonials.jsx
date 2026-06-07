'use client'

// components/landing/Testimonials.jsx

import { ChevronDown, Quote } from 'lucide-react'
import { FAQ_HEADER, FAQS, FOUNDER, TESTIMONIALS, TESTIMONIALS_HEADER } from './data'
import { CARD, MUTED_TEXT, PAGE_MAX, SectionHeader, Stars } from './ui'

function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
}

export function Testimonials() {
  return (
    <section className="py-20 sm:py-24">
      <div className={PAGE_MAX}>
        <SectionHeader label="Proof" title={TESTIMONIALS_HEADER} className="mx-auto max-w-3xl">
          The product is designed around the exact moments that make freelance work feel calm, credible, and worth the rate.
        </SectionHeader>

        <div className="stagger mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map(({ name, role, rating, quote }) => (
            <article key={name} className={`${CARD} flex flex-col p-5`}>
              <div className="flex items-center justify-between">
                <Stars count={rating} />
                <Quote aria-hidden="true" className="h-4 w-4 text-neutral-400 dark:text-neutral-600" />
              </div>

              <p className={`mt-5 flex-1 text-[14px] leading-7 ${MUTED_TEXT}`}>&quot;{quote}&quot;</p>

              <div className="mt-6 flex items-center gap-3 border-t border-neutral-200 pt-4 dark:border-white/10">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-950 text-[12px] font-semibold text-white dark:bg-white dark:text-neutral-950">
                  {initials(name)}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-neutral-950 dark:text-white">{name}</p>
                  <p className={`mt-0.5 text-[12px] ${MUTED_TEXT}`}>{role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="reveal mx-auto mt-8 max-w-3xl rounded-lg border border-neutral-200 bg-neutral-950 p-6 text-white dark:border-white/10 dark:bg-white dark:text-neutral-950 sm:p-8">
          <p className="font-display text-2xl font-semibold leading-tight">A note from the founder</p>
          <p className="mt-4 text-[15px] leading-8 text-neutral-300 dark:text-neutral-700">&quot;{FOUNDER.quote}&quot;</p>
          <p className="mt-5 text-[13px] font-semibold">{FOUNDER.name}</p>
        </div>
      </div>
    </section>
  )
}

export function FAQ() {
  return (
    <section id="faq" className="py-20 sm:py-24">
      <div className="mx-auto max-w-[860px] px-5 sm:px-6 lg:px-8">
        <SectionHeader label="FAQ" title={FAQ_HEADER} className="mx-auto max-w-2xl" />

        <div className="reveal mt-10 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white/75 dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.03]">
          {FAQS.map(({ q, a }, index) => (
            <details key={q} className="group" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 text-left text-[15px] font-semibold text-neutral-950 outline-none transition hover:bg-neutral-50 focus-visible:bg-neutral-50 dark:text-white dark:hover:bg-white/[0.04] dark:focus-visible:bg-white/[0.04]">
                {q}
                <ChevronDown
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-neutral-500 transition-transform duration-200 group-open:rotate-180 dark:text-neutral-400"
                />
              </summary>
              <div className={`px-5 pb-5 pr-10 text-[14px] leading-7 ${MUTED_TEXT}`}>{a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
