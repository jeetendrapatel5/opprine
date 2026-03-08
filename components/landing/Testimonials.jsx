'use client'
// ─────────────────────────────────────────────────────────────────────────────
// components/landing/Testimonials.jsx
// ─────────────────────────────────────────────────────────────────────────────
import { TESTIMONIALS } from './data'
import { SectionLabel, SectionHeading, StarRating } from './ui'

// Generates a unique gradient for each reviewer's avatar
// based on the character codes of their name — deterministic, no randomness
function avatarGradient(name) {
  const h1 = (name.charCodeAt(0) * 7) % 360
  const h2 = (name.charCodeAt(2) * 7) % 360
  return `linear-gradient(135deg, hsl(${h1},55%,38%), hsl(${h2},65%,52%))`
}

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-20 px-6 max-w-[1120px] mx-auto">
      <div className="reveal text-center mb-14">
        <SectionLabel>Testimonials</SectionLabel>
        <SectionHeading>Freelancers already look<br /><em>like agencies.</em></SectionHeading>
      </div>

      <div className="stagger grid grid-cols-1 md:grid-cols-3 gap-3">
        {TESTIMONIALS.map(({ name, role, rating, text }) => (
          <div
            key={name}
            className="card-hover bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6"
          >
            <StarRating count={rating} />

            <p className="mt-4 mb-5 text-[14px] italic text-slate-400 leading-[1.85]">
              &ldquo;{text}&rdquo;
            </p>

            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-[9px] flex-shrink-0 flex items-center justify-center text-[12px] font-black text-white"
                style={{ background: avatarGradient(name) }}
              >
                {name[0]}
              </div>
              <div>
                <p className="font-bold text-[12px] text-slate-100">{name}</p>
                <p className="text-[11px] text-slate-600 mt-0.5">{role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}