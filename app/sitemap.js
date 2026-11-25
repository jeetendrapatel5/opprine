// app/sitemap.js
//
// Served at /sitemap.xml. Lists the public marketing and legal pages, the
// public freelancer profiles and the published case studies, using the same
// visibility rules as app/u/[username] and app/showcase/[slug].

import prisma from '@/lib/prisma'
import { buildSitemapEntries, getSiteUrl, MAX_URLS } from '@/lib/seo/sitemap'

// Reads the database, so it must not run at build time.
export const dynamic = 'force-dynamic'

export default async function sitemap() {
  const baseUrl = getSiteUrl()

  const [profiles, showcases] = await Promise.all([
    prisma.user.findMany({
      where: { profileEnabled: true, username: { not: null } },
      select: { username: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: MAX_URLS,
    }),
    prisma.project.findMany({
      where: {
        publicSlug: { not: null },
        OR: [{ isPublic: true }, { caseStudyEnabled: true }],
      },
      select: { publicSlug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: MAX_URLS,
    }),
  ])

  return buildSitemapEntries({ baseUrl, profiles, showcases })
}