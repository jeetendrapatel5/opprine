'use client'
// ─────────────────────────────────────────────────────────────────────────────
// components/landing/Stats.jsx
// ─────────────────────────────────────────────────────────────────────────────
import { STATS } from './data'
import { useCounter, useInView } from './hooks'

// Each stat cell handles its own scroll detection and counter animation.
// This is cleaner than tracking all four from a parent component.
function StatCell({ stat }) {
  const { ref, inView } = useInView(0.4)
  const count = useCounter(stat.target, stat.duration, inView)

  return (
    <div ref={ref} className="bg-[#08090C] py-9 px-8 text-center">
      <div className="text-[44px] font-black text-slate-50 tracking-[-0.04em] leading-none mb-2">
        {count}{stat.suffix}
      </div>
      <div className="text-[13px] text-slate-600 font-medium leading-snug">{stat.label}</div>
    </div>
  )
}

export default function Stats() {
  return (
    <section className="py-20 px-6 max-w-[1120px] mx-auto">
      {/*
        gap-px + bg-white/5 creates the divider lines:
        each cell has bg-[#08090C] and the gaps show the parent's bg color.
      */}
      <div className="stagger grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.05] rounded-2xl overflow-hidden border border-white/[0.05]">
        {STATS.map(stat => <StatCell key={stat.label} stat={stat} />)}
      </div>
    </section>
  )
}