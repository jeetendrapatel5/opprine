// lib/milestoneTemplates.js
//
// Static, hardcoded milestone templates for common project types — a
// starting point a freelancer can apply to a new project instead of
// creating every milestone by hand. Deliberately NOT a DB model, per
// decision #5 in the staffing/tasks handoff doc: these are the same
// for everyone right now, there's no per-workspace customization, and
// adding one is a one-line edit here instead of a migration + admin
// UI. Revisit as a real model only once agencies actually ask to build
// their own.
//
// Zero framework/DB imports on purpose — same reasoning lib/errors.js
// stays framework-free. Nothing here touches Prisma, so it's safe to
// import from a route, a script, or a test without pulling in a live
// DB connection.

export const MILESTONE_TEMPLATES = [
  {
    key: 'website-redesign',
    name: 'Website Redesign',
    description: 'A full redesign of an existing site — new visual direction, same core content.',
    milestones: [
      { title: 'Discovery & Planning' },
      { title: 'Design Concepts' },
      { title: 'Design Revisions' },
      { title: 'Development' },
      { title: 'Client Review & Testing' },
      { title: 'Launch' },
    ],
  },
  {
    key: 'web-app-mvp',
    name: 'Web App (MVP)',
    description: 'A new web application built from scratch, scoped to a first shippable version.',
    milestones: [
      { title: 'Discovery & Requirements' },
      { title: 'UI/UX Design' },
      { title: 'Core Development' },
      { title: 'Testing & QA' },
      { title: 'Client Review' },
      { title: 'Launch & Handoff' },
    ],
  },
  {
    key: 'landing-page',
    name: 'Landing Page',
    description: 'A single-page marketing or campaign site.',
    milestones: [
      { title: 'Discovery' },
      { title: 'Design' },
      { title: 'Development' },
      { title: 'Review & Revisions' },
      { title: 'Launch' },
    ],
  },
  {
    key: 'ecommerce-store',
    name: 'E-commerce Store',
    description: 'A new online store, including catalog and checkout setup.',
    milestones: [
      { title: 'Discovery & Planning' },
      { title: 'Design' },
      { title: 'Product & Catalog Setup' },
      { title: 'Development & Integrations' },
      { title: 'Testing' },
      { title: 'Launch' },
    ],
  },
]

// Returns the picker-friendly list — key/name/description only, no
// milestone contents. Kept as a function rather than exporting
// MILESTONE_TEMPLATES directly for this use, so a picker UI doesn't
// reach into the full template shape just to render a dropdown — same
// reasoning listProjectMembers() returns a mapped shape instead of
// raw Prisma rows.
export function listMilestoneTemplates() {
  return MILESTONE_TEMPLATES.map(({ key, name, description }) => ({ key, name, description }))
}

// Returns one template's full milestone list by key, or null if the
// key doesn't match anything. Returns null rather than throwing —
// this file has no error classes of its own to throw, and "unknown
// template key" is a caller-side validation problem (a future "apply
// template" route should treat null as a 400), not a NotFoundError
// the way a missing DB row would be.
export function getMilestoneTemplate(key) {
  return MILESTONE_TEMPLATES.find((template) => template.key === key) ?? null
}