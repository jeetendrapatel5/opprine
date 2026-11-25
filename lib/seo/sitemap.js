// lib/seo/sitemap.js
//
// Pure helpers for app/sitemap.js and app/robots.js.

export const STATIC_PATHS = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/signup', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/refund-policy', changeFrequency: 'yearly', priority: 0.3 },
]

// Routes that need a login or carry private tokens. Kept out of search.
export const DISALLOWED_PATHS = ['/dashboard', '/api/', '/portal/', '/invite/', '/settings']

// Google accepts at most 50,000 URLs in one sitemap file.
export const MAX_URLS = 50000

export function getSiteUrl(env = process.env) {
  const raw = env.NEXT_PUBLIC_APP_URL?.trim()
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new Error('NEXT_PUBLIC_APP_URL must be set to the public site URL, for example https://opprine.com')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('NEXT_PUBLIC_APP_URL must start with https://')
  }
  return url.origin
}

export function buildSitemapEntries({ baseUrl, profiles = [], showcases = [] }) {
  const entries = [
    ...STATIC_PATHS.map(({ path, changeFrequency, priority }) => ({
      url: `${baseUrl}${path === '/' ? '' : path}`,
      changeFrequency,
      priority,
    })),
    ...profiles.map(({ username, updatedAt }) => ({
      url: `${baseUrl}/u/${encodeURIComponent(username)}`,
      lastModified: updatedAt,
      changeFrequency: 'weekly',
      priority: 0.6,
    })),
    ...showcases.map(({ publicSlug, updatedAt }) => ({
      url: `${baseUrl}/showcase/${encodeURIComponent(publicSlug)}`,
      lastModified: updatedAt,
      changeFrequency: 'monthly',
      priority: 0.6,
    })),
  ]
  return entries.slice(0, MAX_URLS)
}

export function buildRobots(baseUrl) {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: DISALLOWED_PATHS }],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}