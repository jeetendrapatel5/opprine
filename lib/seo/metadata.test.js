// lib/seo/metadata.test.js
//
// Run with:  node --test lib/seo/metadata.test.js

import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPageMetadata } from './metadata.js'

const page = { title: 'Privacy Policy', description: 'How Opprine handles personal data.', path: '/privacy' }

test('the title is passed through without the brand so the layout template adds it once', () => {
  const meta = buildPageMetadata(page)
  assert.equal(meta.title, 'Privacy Policy')
  assert.ok(!meta.title.includes('Opprine'))
})

test('the canonical is the page path and the share card repeats the brand details', () => {
  const meta = buildPageMetadata(page)
  assert.equal(meta.alternates.canonical, '/privacy')
  assert.equal(meta.openGraph.url, '/privacy')
  assert.equal(meta.openGraph.title, 'Privacy Policy | Opprine')
  assert.equal(meta.openGraph.siteName, 'Opprine')
  assert.equal(meta.openGraph.type, 'website')
})

test('pages are indexable by default and can opt out with noindex', () => {
  assert.equal(buildPageMetadata(page).robots, undefined)
  assert.deepEqual(buildPageMetadata({ ...page, noindex: true }).robots, { index: false, follow: false })
})

test('a missing field or a path without a leading slash is rejected', () => {
  assert.throws(() => buildPageMetadata({ ...page, title: '' }), /buildPageMetadata/)
  assert.throws(() => buildPageMetadata({ ...page, description: undefined }), /buildPageMetadata/)
  assert.throws(() => buildPageMetadata({ ...page, path: 'privacy' }), /buildPageMetadata/)
})