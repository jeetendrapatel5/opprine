// lib/seo/sitemap.test.js
//
// Run with:  node --test lib/seo/sitemap.test.js

import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSitemapEntries, buildRobots, getSiteUrl, MAX_URLS } from './sitemap.js'

const BASE = 'https://opprine.com'

test('the site URL is normalised and a missing or invalid value is rejected', () => {
  assert.equal(getSiteUrl({ NEXT_PUBLIC_APP_URL: 'https://opprine.com/' }), 'https://opprine.com')
  assert.equal(getSiteUrl({ NEXT_PUBLIC_APP_URL: ' https://app.opprine.com/some/path ' }), 'https://app.opprine.com')
  assert.throws(() => getSiteUrl({}), /NEXT_PUBLIC_APP_URL/)
  assert.throws(() => getSiteUrl({ NEXT_PUBLIC_APP_URL: 'opprine.com' }), /NEXT_PUBLIC_APP_URL/)
  assert.throws(() => getSiteUrl({ NEXT_PUBLIC_APP_URL: 'ftp://opprine.com' }), /https/)
})

test('static pages are listed with absolute URLs and the home page has no trailing path', () => {
  const urls = buildSitemapEntries({ baseUrl: BASE }).map((e) => e.url)
  assert.deepEqual(urls, [BASE, `${BASE}/signup`, `${BASE}/terms`, `${BASE}/privacy`, `${BASE}/refund-policy`])
})

test('profiles and case studies are added with encoded paths and last-modified dates', () => {
  const updatedAt = new Date('2026-11-01T00:00:00Z')
  const entries = buildSitemapEntries({
    baseUrl: BASE,
    profiles: [{ username: 'jane doe', updatedAt }],
    showcases: [{ publicSlug: 'luminary-website', updatedAt }],
  })
  const profile = entries.find((e) => e.url.includes('/u/'))
  const showcase = entries.find((e) => e.url.includes('/showcase/'))
  assert.equal(profile.url, `${BASE}/u/jane%20doe`)
  assert.equal(showcase.url, `${BASE}/showcase/luminary-website`)
  assert.equal(profile.lastModified, updatedAt)
})

test('the sitemap never exceeds the 50,000 URL limit', () => {
  const profiles = Array.from({ length: MAX_URLS }, (_, i) => ({ username: `u${i}`, updatedAt: new Date() }))
  assert.equal(buildSitemapEntries({ baseUrl: BASE, profiles }).length, MAX_URLS)
})

test('robots allows the site, blocks private routes and names the sitemap', () => {
  const robots = buildRobots(BASE)
  assert.equal(robots.sitemap, `${BASE}/sitemap.xml`)
  const rule = robots.rules[0]
  assert.equal(rule.allow, '/')
  for (const path of ['/dashboard', '/api/', '/portal/', '/invite/']) assert.ok(rule.disallow.includes(path), path)
})