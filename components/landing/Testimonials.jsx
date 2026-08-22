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
    <section className="py-20 sm:py-28">
      <div className={PAGE_MAX}>
        <SectionHeader title={TESTIMONIALS_HEADER} className="mx-auto max-w-3xl">
          The product is designed around the exact moments that make freelance work feel calm, credible, and worth
          the rate.
        </SectionHeader>

        <div className="stagger mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map(({ name, role, rating, quote }) => (
            <article key={name} className={`${CARD} flex flex-col p-5 sm:p-6`}>
              <div className="flex items-center justify-between">
                <Stars count={rating} />
                <Quote aria-hidden="true" className="h-4 w-4 text-[#D9D1C3]" />
              </div>

              <p className={`mt-5 flex-1 text-[14px] leading-7 ${MUTED_TEXT}`}>&quot;{quote}&quot;</p>

              <div className="mt-6 flex items-center gap-3 border-t border-[#E7E0D3] pt-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#17130F] text-[12px] font-semibold text-white">
                  {initials(name)}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#17130F]">{name}</p>
                  <p className={`mt-0.5 text-[12px] ${MUTED_TEXT}`}>{role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="reveal mx-auto mt-8 max-w-3xl rounded-2xl border border-[#E7E0D3] bg-[#17130F] p-6 text-white sm:p-8">
          <p className="font-display text-2xl font-semibold leading-tight">A note from the founder</p>
          <p className="mt-4 text-[15px] leading-8 text-white/60">&quot;{FOUNDER.quote}&quot;</p>
          <p className="mt-5 text-[13px] font-semibold text-white/90">{FOUNDER.name}</p>
        </div>
      </div>
    </section>
  )
}

export function FAQ() {
  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="mx-auto max-w-[860px] px-5 sm:px-6 lg:px-8">
        <SectionHeader title={FAQ_HEADER} className="mx-auto max-w-2xl" />

        <div className="reveal mt-10 divide-y divide-[#E7E0D3] rounded-2xl border border-[#E7E0D3] bg-white">
          {FAQS.map(({ q, a }, index) => (
            <details key={q} className="group" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 text-left text-[15px] font-semibold text-[#17130F] outline-none transition hover:bg-[#F4EEE4]/60 focus-visible:bg-[#F4EEE4]/60 sm:px-6">
                {q}
                <ChevronDown
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-[#948C7E] transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <div className={`px-5 pb-5 pr-10 text-[14px] leading-7 sm:px-6 ${MUTED_TEXT}`}>{a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}