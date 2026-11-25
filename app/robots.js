// app/robots.js
//
// Served at /robots.txt. Points crawlers at the sitemap and keeps the
// authenticated app, API routes and token links out of search.

import { buildRobots, getSiteUrl } from '@/lib/seo/sitemap'

export default function robots() {
  return buildRobots(getSiteUrl())
}