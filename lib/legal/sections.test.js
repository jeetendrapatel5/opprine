// lib/legal/sections.test.js
//
// Run with:  node --test lib/legal/sections.test.js

import test from 'node:test'
import assert from 'node:assert/strict'
import { LEGAL_DOCUMENTS, textOf, slugify, uniqueSlugs, toIsoDate, pickActiveSection } from './sections.js'

test('textOf reads plain strings, arrays and nested elements', () => {
  assert.equal(textOf('Who we are'), 'Who we are')
  assert.equal(textOf(['Who ', { props: { children: 'we' } }, ' are']), 'Who we are')
  assert.equal(textOf(null), '')
  assert.equal(textOf(false), '')
})

test('slugify makes readable anchors', () => {
  assert.equal(slugify('Who we are'), 'who-we-are')
  assert.equal(slugify('Plans, billing and renewal'), 'plans-billing-and-renewal')
  assert.equal(slugify('Availability & liability'), 'availability-and-liability')
  assert.equal(slugify('???'), 'section')
})

test('repeated headings get distinct anchors', () => {
  assert.deepEqual(uniqueSlugs(['Contact', 'Billing', 'Contact']), ['contact', 'billing', 'contact-2'])
})

test('the "last updated" text becomes an ISO date, and anything else is left out', () => {
  assert.equal(toIsoDate('25 November 2026'), '2026-11-25')
  assert.equal(toIsoDate(' 3 march 2027 '), '2027-03-03')
  assert.equal(toIsoDate('31 February 2026'), null)
  assert.equal(toIsoDate('November 2026'), null)
  assert.equal(toIsoDate(undefined), null)
})

test('the active section is the last heading that has reached the offset', () => {
  const items = [{ id: 'a', top: -400 }, { id: 'b', top: 80 }, { id: 'c', top: 500 }]
  assert.equal(pickActiveSection(items, 120), 'b')
  assert.equal(pickActiveSection([{ id: 'a', top: 300 }, { id: 'b', top: 900 }], 120), 'a')
  assert.equal(pickActiveSection(items, 120, true), 'c')
  assert.equal(pickActiveSection([], 120), null)
})

test('every legal document has a title and a path', () => {
  assert.equal(LEGAL_DOCUMENTS.length, 3)
  for (const doc of LEGAL_DOCUMENTS) assert.ok(doc.title && doc.href.startsWith('/'))
})