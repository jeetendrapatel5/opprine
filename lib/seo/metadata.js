// lib/seo/metadata.js
//
// Builds the metadata object for one page.
//
// Why a helper: when a page defines its own `openGraph`, Next.js replaces the
// root layout's `openGraph` instead of merging with it, so every page has to
// repeat siteName, type and locale. This keeps that in one place.
//
// Pass the page title WITHOUT the brand name. The root layout's title
// template adds " | Opprine". Relative paths are resolved against
// `metadataBase`, which the root layout sets.

import { SITE_NAME } from './site.js'

export function buildPageMetadata({ title, description, path, noindex = false }) {
  if (!title || !description || !path || !path.startsWith('/')) {
    throw new Error('buildPageMetadata needs a title, a description and a path that starts with "/"')
  }

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      // Open Graph titles are not run through the layout's title template.
      title: `${title} | ${SITE_NAME}`,
      description,
      url: path,
      siteName: SITE_NAME,
      type: 'website',
      locale: 'en_US',
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  }
}