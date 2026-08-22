'use client'

// components/landing/FinalCTA.jsx

import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import {
  FINAL_BODY,
  FINAL_CTA,
  FINAL_HEADLINE,
  FINAL_NOTE,
  FOOTER_COPYRIGHT,
  FOOTER_LINKS,
  FOOTER_TAGLINE,
} from './data'
import { PAGE_MAX } from './ui'

export function FinalCTA({ onCTA }) {
  return (
    <section className="border-y border-[#E7E0D3] bg-[#17130F] py-20 text-white sm:py-28">
      <div className={`${PAGE_MAX} text-center`}>
        <div className="reveal mx-auto max-w-4xl">
          <h2 className="font-display text-center text-3xl font-semibold leading-[1.1] sm:text-4xl lg:text-[2.75rem]">
            {FINAL_HEADLINE}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-8 text-white/55">{FINAL_BODY}</p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onCTA}
              className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#1E6F45] px-5 py-3 text-[14px] font-semibold text-white transition duration-200 hover:bg-[#2C8557] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#17130F]"
            >
              {FINAL_CTA}
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
            <a
              href="#pricing"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 px-5 py-3 text-[14px] font-semibold text-white transition duration-200 hover:border-white/35"
            >
              Compare plans
            </a>
          </div>

          <p className="mt-5 text-[12px] font-medium text-white/40">{FINAL_NOTE}</p>
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="bg-[#FFFAFA] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className={PAGE_MAX}>
        <div className="flex flex-col gap-10 border-b border-[#E7E0D3] pb-10 lg:flex-row lg:items-start lg:gap-12">
          <div className="w-full max-w-xs">
            <Image
              src="/logo/opprine-main-logo.png"
              alt="Opprine"
              width={75}
              height={30}
              className="h-15 w-auto"
            />
            <p className="mt-4 text-[13px] leading-6 text-[#6F675C] sm:text-sm">{FOOTER_TAGLINE}</p>
          </div>

          <div className="grid w-full grid-cols-3 gap-4 sm:gap-5 lg:ml-auto lg:w-auto lg:flex-none lg:gap-18">
            {FOOTER_LINKS.map(({ heading, links }) => (
              <div key={heading} className="min-w-0">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#948C7E] sm:text-[11px]">
                  {heading}
                </p>

                <div className="mt-4 flex flex-col gap-3">
                  {links.map(({ label, href }) => (
                    <a
                      key={label}
                      href={href}
                      className="text-[12px] font-medium text-[#6F675C] transition-colors duration-150 hover:text-[#17130F] sm:text-sm"
                    >
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-6 text-[12px] text-[#948C7E] sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="break-words">{FOOTER_COPYRIGHT}</p>
          <p className="break-words">Independent by design.</p>
        </div>
      </div>
    </footer>
  )
}