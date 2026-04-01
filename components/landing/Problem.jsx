'use client'
// components/landing/Problem.jsx
// Contains: Problem, Reframe, HowItWorks, Features sections

import { useState } from 'react'
import {
  PAIN_HEADER, PAIN_CARDS,
  REFRAME_LABEL, REFRAME_BODY,
  HOW_HEADER, HOW_STEPS,
  FEATURES_HEADER, FEATURES,
} from './data'
import { SectionLabel, SectionHeading, CheckItem, WindowChrome } from './ui'

// ── PROBLEM ───────────────────────────────────────────────────────────────────
export function Problem() {
  return (
    <section className="py-20 px-6 max-w-[1120px] mx-auto">
      <div className="reveal text-center mb-14">
        <SectionLabel>The Problem</SectionLabel>
        <SectionHeading>{PAIN_HEADER}</SectionHeading>
      </div>

      {/* 2×2 grid of pain cards */}
      <div className="stagger grid grid-cols-1 md:grid-cols-2 gap-4">
        {PAIN_CARDS.map(({ id, open, body, sting }) => (
          <div
            key={id}
            className="bg-fp-surface border border-fp-border rounded-xl p-6 hover:border-fp-border/60 transition-colors duration-200"
          >
            {/* Opening — larger, heavier, the hook */}
            <p className="font-semibold text-fp-text-primary text-[15px] leading-snug mb-3 whitespace-pre-line">
              {open}
            </p>
            {/* Story — regular weight, the scenario */}
            <p className="text-fp-text-secondary text-[13px] leading-[1.8] mb-3">
              {body}
            </p>
            {/* Emotional consequence — the sting */}
            {sting && (
              <p className="text-fp-text-tertiary text-[12px] leading-relaxed italic border-t border-fp-border pt-3">
                {sting}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// ── REFRAME ───────────────────────────────────────────────────────────────────
export function Reframe() {
  const [line1, line2] = REFRAME_BODY.split('\n\n')
  return (
    <section className="py-16 px-6 border-t border-fp-border">
      <div className="max-w-[640px] mx-auto text-center reveal">
        <SectionHeading className="mb-6">{REFRAME_LABEL}</SectionHeading>
        <p className="text-fp-text-secondary text-[15px] leading-[1.85] mb-4">{line1}</p>
        <p className="text-fp-text-primary text-[15px] leading-[1.85] font-medium">{line2}</p>
      </div>
    </section>
  )
}

// ── HOW IT WORKS ──────────────────────────────────────────────────────────────
export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-6 bg-fp-surface/40 border-t border-b border-fp-border">
      <div className="max-w-[1120px] mx-auto">
        <div className="reveal text-center mb-14">
          <SectionLabel>How it works</SectionLabel>
          <SectionHeading>{HOW_HEADER}</SectionHeading>
        </div>

        <div className="stagger grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-8 left-[22%] right-[22%] h-px bg-gradient-to-r from-fp-accent/20 via-fp-accent/40 to-fp-accent/20 z-0" />

          {HOW_STEPS.map(({ step, title, desc, result }) => (
            <div key={step} className="relative z-10">
              {/* Step number */}
              <div className="
                w-16 h-16 rounded-xl bg-fp-accent-muted border border-fp-accent/20
                flex items-center justify-center mb-5
              ">
                <span className="font-mono text-fp-accent text-[13px] font-bold tracking-[0.1em]">{step}</span>
              </div>

              <h3 className="text-fp-text-primary font-semibold text-[17px] mb-2 tracking-tight">
                {title}
              </h3>
              <p className="text-fp-text-secondary text-[13px] leading-[1.8] mb-3">{desc}</p>
              <p className="text-fp-accent text-[12px] font-medium italic leading-snug">
                → {result}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── FEATURES ──────────────────────────────────────────────────────────────────
export function Features() {
  return (
    <section id="features" className="py-20 px-6 max-w-[1120px] mx-auto">
      <div className="reveal text-center mb-14">
        <SectionLabel>Features</SectionLabel>
        <SectionHeading>{FEATURES_HEADER}</SectionHeading>
      </div>

      {/* 2×3 grid */}
      <div className="stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map(({ icon, name, desc, fix }) => (
          <div
            key={name}
            className="bg-fp-surface border border-fp-border rounded-xl p-5 hover:border-fp-accent/20 transition-colors duration-200 group"
          >
            <div className="text-2xl mb-4 leading-none">{icon}</div>
            <h3 className="text-fp-text-primary font-semibold text-[14px] mb-2 leading-snug">
              {name}
            </h3>
            <p className="text-fp-text-secondary text-[13px] leading-[1.75] mb-4">
              {desc}
            </p>
            {/* "Fixes:" tag — callback to pain section */}
            <p className="text-fp-text-tertiary text-[11px] font-medium border-t border-fp-border pt-3">
              {fix}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── PORTAL MOMENT ─────────────────────────────────────────────────────────────
// The aspirational money shot. Shows the client portal (warm world).
// Full-width section with maximum contrast — dark page, warm portal card.
export function PortalMoment({ onCTA }) {
  return (
    <section className="py-20 px-6 border-t border-fp-border">
      <div className="max-w-[1120px] mx-auto">

        {/* Copy above */}
        <div className="reveal text-center mb-12">
          <SectionLabel>The Portal</SectionLabel>
          <SectionHeading className="mb-6">
            Not a forwarded email.<br />
            Not a Notion doc. <em>This.</em>
          </SectionHeading>
          <p className="text-fp-text-secondary text-[15px] leading-[1.8] max-w-[520px] mx-auto">
            A clean, professional portal. Their project. Their milestones. What's done, what's in progress, what's coming next. And a clear prompt for what they need to do right now.
          </p>
        </div>

        {/* Portal mockup — warm white world */}
        <div className="reveal max-w-[720px] mx-auto rounded-2xl overflow-hidden border border-fp-border shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
          <WindowChrome url="portal.freeport.dev/p/luminary" dark={false} />

          {/* Portal content — deliberately using portal colors */}
          <div className="bg-fp-portal-bg p-6">

            {/* Progress banner */}
            <div className="bg-fp-portal-surface border border-fp-portal-border rounded-xl overflow-hidden mb-4">
              <div className="h-[2px] bg-fp-portal-accent opacity-70" />
              <div className="px-5 py-5">
                <p className="text-fp-portal-text-tertiary text-[10px] font-bold uppercase tracking-widest mb-1">
                  Rahul's Portal
                </p>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-fp-portal-text-primary font-medium text-xl">
                    Luminary Co. Website
                  </h2>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-fp-portal-success/10 text-fp-portal-success">
                    On Track
                  </span>
                </div>
                <div className="bg-fp-portal-raised h-2 rounded-full mb-2">
                  <div className="h-2 rounded-full bg-fp-portal-accent" style={{ width: '70%' }} />
                </div>
                <div className="flex justify-between text-[11px] text-fp-portal-text-tertiary">
                  <span><span className="text-fp-portal-text-primary font-semibold">3</span> of <span className="text-fp-portal-text-primary font-semibold">4</span> milestones complete</span>
                  <span>Last update 2h ago</span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-fp-portal-surface border border-fp-portal-border rounded-xl p-5">
              <h3 className="text-fp-portal-text-secondary text-[10px] font-bold uppercase tracking-widest mb-4">Project Timeline</h3>

              {[
                { title: 'Discovery & Strategy',   status: 'COMPLETED', note: '✓ Approved · 3 Mar 2025' },
                { title: 'Design & Wireframes',    status: 'COMPLETED', note: '✓ Approved · 15 Mar 2025' },
                { title: 'Homepage Development',   status: 'IN_REVIEW', note: null },
                { title: 'Final QA & Handoff',     status: 'PENDING',   note: 'Not started yet' },
              ].map((m, i) => (
                <div key={i} className="flex gap-3 mb-4 last:mb-0">
                  {/* Node */}
                  <div className="flex flex-col items-center">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      m.status === 'COMPLETED' ? 'bg-fp-portal-accent' :
                      m.status === 'IN_REVIEW' ? 'ring-2 ring-fp-portal-accent ring-offset-1 ring-offset-fp-portal-surface' :
                      'border-2 border-fp-portal-border'
                    }`}>
                      {m.status === 'COMPLETED' && (
                        <svg width="9" height="9" fill="none" viewBox="0 0 9 9"><path d="M1 4.5L3.2 7L8 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      )}
                    </div>
                    {i < 3 && <div className="w-px flex-1 bg-fp-portal-border mt-1" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-1">
                    {m.status === 'IN_REVIEW' ? (
                      // Delivery card
                      <div className="bg-fp-portal-surface border border-fp-portal-accent/25 rounded-xl overflow-hidden">
                        <div className="h-[2px] bg-fp-portal-accent" />
                        <div className="p-4">
                          <p className="font-display text-fp-portal-text-primary font-medium text-[15px] mb-1">
                            Homepage is ready for your review
                          </p>
                          <p className="text-fp-portal-text-secondary text-[12px] mb-4 leading-relaxed">
                            All sections are complete — hero, features, pricing. Please check that the contact form works correctly.
                          </p>
                          <div className="flex gap-2">
                            <button className="flex-1 text-[12px] font-semibold py-2 rounded-lg border border-fp-portal-border text-fp-portal-text-secondary">
                              Request Changes
                            </button>
                            <button className="flex-1 text-[12px] font-bold py-2 rounded-lg bg-fp-portal-success text-white">
                              Approve
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-0.5">
                        <p className={`text-[13px] font-medium ${m.status === 'COMPLETED' ? 'line-through text-fp-portal-text-tertiary' : 'text-fp-portal-text-secondary'}`}>
                          {m.title}
                        </p>
                        {m.note && (
                          <p className={`text-[11px] mt-0.5 ${m.status === 'COMPLETED' ? 'text-fp-portal-accent' : 'text-fp-portal-text-tertiary'}`}>
                            {m.note}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Copy below */}
        <div className="reveal text-center mt-10">
          <p className="text-fp-text-secondary text-[15px] leading-[1.85] max-w-[520px] mx-auto mb-2">
            Imagine your best client opening this instead of a WhatsApp thread.
          </p>
          <p className="text-fp-text-primary text-[15px] font-medium">
            That's the difference between a client who trusts you and one who questions every decision.
          </p>
        </div>

      </div>
    </section>
  )
}