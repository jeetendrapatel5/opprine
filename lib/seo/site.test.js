// lib/seo/site.test.js
//
// Run with:  node --test lib/seo/site.test.js

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SITE_NAME,
  SITE_TITLE,
  SITE_DESCRIPTION,
  buildWebSiteJsonLd,
  serializeJsonLd,
} from './site.js'

test('WebSite structured data names the site Opprine and points at the home page', () => {
  const data = buildWebSiteJsonLd('https://opprine.com')
  assert.equal(data['@context'], 'https://schema.org')
  assert.equal(data['@type'], 'WebSite')
  assert.equal(data.name, 'Opprine')
  assert.equal(data.url, 'https://opprine.com/')
  assert.deepEqual(data.alternateName, ['opprine.com'])
})

test('a path or trailing slash in the base URL never leaks into the structured data', () => {
  const data = buildWebSiteJsonLd('https://opprine.com/some/path/')
  assert.equal(data.url, 'https://opprine.com/')
})

test('serialised JSON-LD cannot close the script tag and still parses back', () => {
  const data = { name: '</script><script>alert(1)</script>' }
  const text = serializeJsonLd(data)
  assert.ok(!text.includes('<'))
  assert.deepEqual(JSON.parse(text), data)
})

test('title and description fit what search engines display and use the brand name', () => {
  assert.ok(SITE_TITLE.startsWith(SITE_NAME))
  assert.ok(SITE_TITLE.length <= 60, `title is ${SITE_TITLE.length} characters`)
  assert.ok(SITE_DESCRIPTION.length <= 160, `description is ${SITE_DESCRIPTION.length} characters`)
  assert.ok(SITE_DESCRIPTION.startsWith(SITE_NAME))
})