'use client'
// components/landing/Testimonials.jsx
import { TESTIMONIALS_HEADER, TESTIMONIALS, FOUNDER, FAQ_HEADER, FAQS } from './data'
import { SectionLabel, SectionHeading, Stars } from './ui'

function avatarGradient(name) {
  const h1 = (name.charCodeAt(0) * 11) % 360
  const h2 = (name.charCodeAt(1) * 13) % 360
  return `linear-gradient(135deg, hsl(${h1},45%,35%), hsl(${h2},55%,50%))`
}

// ── TESTIMONIALS ──────────────────────────────────────────────────────────────
export function Testimonials() {
  return (
    <section id="testimonials" className="py-20 px-6 max-w-[1120px] mx-auto">
      <div className="reveal text-center mb-14">
        <SectionLabel>Testimonials</SectionLabel>
        <SectionHeading>{TESTIMONIALS_HEADER}</SectionHeading>
      </div>

      {/* 3-column testimonial grid */}
      <div className="stagger grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {TESTIMONIALS.map(({ name, role, rating, quote }) => (
          <div
            key={name}
            className="bg-fp-surface border border-fp-border rounded-xl p-5 flex flex-col hover:border-fp-border/60 transition-colors duration-200"
          >
            <Stars count={rating} />

            <p className="mt-4 mb-5 text-fp-text-secondary text-[13px] italic leading-[1.85] flex-1">
              "{quote}"
            </p>

            <div className="flex items-center gap-3 border-t border-fp-border pt-4">
              <div
                className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-[12px] font-bold text-white"
                style={{ background: avatarGradient(name) }}
              >
                {name[0]}
              </div>
              <div>
                <p className="text-fp-text-primary font-semibold text-[12px]">{name}</p>
                <p className="text-fp-text-tertiary text-[11px] mt-0.5">{role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Founder note — personal, vulnerable, trust-building */}
      <div className="reveal max-w-[640px] mx-auto bg-fp-surface border border-fp-border rounded-xl p-6">
        <p className="text-fp-text-secondary text-[13px] italic leading-[1.9] mb-4">
          "{FOUNDER.quote}"
        </p>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-fp-accent-muted border border-fp-accent/20 flex items-center justify-center flex-shrink-0">
            <span className="text-fp-accent font-bold text-[12px]">J</span>
          </div>
          <p className="text-fp-text-primary font-semibold text-[12px]">{FOUNDER.name}</p>
        </div>
      </div>
    </section>
  )
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
export function FAQ() {
  return (
    <section className="py-16 px-6 border-t border-fp-border">
      <div className="max-w-[680px] mx-auto">
        <div className="reveal text-center mb-12">
          <SectionLabel>Objections</SectionLabel>
          <SectionHeading>{FAQ_HEADER}</SectionHeading>
        </div>

        {/* Stacked Q&A — no accordion, just plain prose */}
        {/* No accordion = less friction, all answers visible = more persuasion */}
        <div className="stagger space-y-8">
          {FAQS.map(({ q, a }) => (
            <div key={q}>
              <p className="text-fp-text-primary font-semibold text-[15px] mb-2 leading-snug">
                {q}
              </p>
              <p className="text-fp-text-secondary text-[14px] leading-[1.8]">
                {a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}