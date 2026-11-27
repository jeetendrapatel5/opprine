import LandingPage from '@/components/landing'
import { getSiteUrl } from '@/lib/seo/sitemap'
import { SITE_NAME, buildWebSiteJsonLd, serializeJsonLd } from '@/lib/seo/site'

const title = `Client project delivery for web studios | ${SITE_NAME}`
const description = 'Give clients one private portal for project progress, files, approvals and invoices. Opprine is built for web agencies and freelance developers.'

// Canonical URL for the home page. It is resolved against `metadataBase`,
// which is set in the root layout.
export const metadata = {
  alternates: { canonical: '/' },
  title: { absolute: title },
  description,
  openGraph: { title, description, url: '/', type: 'website', siteName: SITE_NAME },
  twitter: { card: 'summary_large_image', title, description },
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