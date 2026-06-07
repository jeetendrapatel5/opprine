'use client'

// components/landing/FinalCTA.jsx

import { ArrowRight, ShieldCheck } from 'lucide-react'
import {
  FINAL_BODY,
  FINAL_CTA,
  FINAL_HEADLINE,
  FINAL_NOTE,
  FOOTER_COPYRIGHT,
  FOOTER_LINKS,
  FOOTER_TAGLINE,
} from './data'
import { LogoMark, PAGE_MAX } from './ui'

export function FinalCTA({ onCTA }) {
  return (
    <section className="border-y border-neutral-200 bg-neutral-950 py-20 text-white dark:border-white/10 dark:bg-white dark:text-neutral-950 sm:py-24">
      <div className={`${PAGE_MAX} text-center`}>
        <div className="reveal mx-auto max-w-3xl">
          <div className="mx-auto mb-6 flex h-11 w-11 items-center justify-center rounded-lg bg-white text-neutral-950 dark:bg-neutral-950 dark:text-white">
            <ShieldCheck aria-hidden="true" className="h-5 w-5" />
          </div>
          <h2 className="font-display text-3xl font-semibold leading-[1.08] sm:text-4xl lg:text-5xl">
            {FINAL_HEADLINE}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-8 text-neutral-300 dark:text-neutral-700">
            {FINAL_BODY}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={onCTA}
              className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-[14px] font-semibold text-neutral-950 transition duration-200 hover:-translate-y-0.5 hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 dark:bg-neutral-950 dark:text-white dark:hover:bg-neutral-800 dark:focus-visible:ring-neutral-950 dark:focus-visible:ring-offset-white"
            >
              {FINAL_CTA}
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
            <a
              href="#pricing"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 px-5 py-3 text-[14px] font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:border-white/35 dark:border-neutral-300 dark:text-neutral-950 dark:hover:border-neutral-950"
            >
              Compare plans
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>

          <p className="mt-5 text-[12px] font-medium text-neutral-400 dark:text-neutral-600">{FINAL_NOTE}</p>
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="px-0 py-12">
      <div className={PAGE_MAX}>
        <div className="flex flex-col gap-10 border-b border-neutral-200 pb-10 dark:border-white/10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xs">
            <LogoMark size={32} />
            <p className="mt-4 text-[13px] leading-6 text-neutral-600 dark:text-neutral-400">{FOOTER_TAGLINE}</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {FOOTER_LINKS.map(({ heading, links }) => (
              <div key={heading}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                  {heading}
                </p>
                <div className="mt-4 flex flex-col gap-3">
                  {links.map(({ label, href }) => (
                    <a
                      key={label}
                      href={href}
                      className="text-[13px] font-medium text-neutral-600 transition-colors duration-150 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                    >
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-6 text-[12px] text-neutral-500 dark:text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <p>{FOOTER_COPYRIGHT}</p>
          <p>Independent by design.</p>
        </div>
      </div>
    </footer>
  )
}
