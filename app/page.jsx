import LandingPage from '@/components/landing'
import { getSiteUrl } from '@/lib/seo/sitemap'
import { buildWebSiteJsonLd, serializeJsonLd } from '@/lib/seo/site'

// Canonical URL for the home page. It is resolved against `metadataBase`,
// which is set in the root layout.
export const metadata = {
  alternates: { canonical: '/' },
}

export default function Home() {
  // WebSite structured data lives on the home page only, so it appears once.
  const jsonLd = buildWebSiteJsonLd(getSiteUrl())

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <LandingPage />
    </>
  )
}