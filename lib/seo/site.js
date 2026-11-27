// lib/seo/site.js
//
// Brand copy and structured data used for SEO. Pure helpers with no framework
// imports, so they can be tested with `node --test`.
// The public site URL comes from getSiteUrl() in lib/seo/sitemap.js.

export const SITE_NAME = 'Opprine'

// Keep the title under about 60 characters and the description under about
// 160 so search results do not cut them off.
export const SITE_TITLE = 'Opprine | Project Delivery & Client Collaboration Platform'
export const SITE_DESCRIPTION =
  'Opprine gives web agencies and independent professionals one place to deliver projects, share progress, collect client feedback and secure approvals.'

// Google's WebSite structured data. Used on the home page only.
// https://developers.google.com/search/docs/appearance/site-names
export function buildWebSiteJsonLd(baseUrl) {
  const { origin } = new URL(baseUrl)
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: `${origin}/`,
  }
}

// Safe to place inside <script type="application/ld+json">. Escaping "<"
// stops any value from closing the script tag early.
export function serializeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}