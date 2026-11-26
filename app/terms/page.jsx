// app/terms/page.jsx

import LegalPage from '@/components/legal/LegalPage'
import { getBusinessDetails } from '@/lib/legal/business'
import { buildPageMetadata } from '@/lib/seo/metadata'

export const dynamic = 'force-dynamic'
export const metadata = buildPageMetadata({
  title: 'Terms of Service',
  description:
    'The terms that govern your use of Opprine, including accounts, plans and billing, acceptable use, your content, and liability.',
  path: '/terms',
})

export default function TermsPage() {
  const business = getBusinessDetails()

  return (
    <LegalPage title="Terms of Service" updated="25 November 2026">
      <section>
        <h2>Agreement</h2>
        <p>
          These terms govern your use of Opprine, a client delivery and project management service operated by{' '}
          {business.name}. By creating an account or using the service you agree to them.
        </p>
      </section>
      <section>
        <h2>Accounts and workspaces</h2>
        <p>
          You are responsible for the accuracy of your account details, for keeping your credentials secure, and for
          activity in your workspace, including that of members you invite and of clients you share portal links
          with.
        </p>
      </section>
      <section>
        <h2>Plans, billing and renewal</h2>
        <ul>
          <li>Plans and their limits are described on the pricing page and in Billing.</li>
          <li>Paid plans are billed in advance through Razorpay and renew automatically until cancelled.</li>
          <li>A payment is confirmed on our side only after Razorpay reports it as successful. Until then the plan does not change.</li>
          <li>Cancellation and refunds are covered by the Cancellation and Refund Policy.</li>
          <li>We may change prices for future periods with notice before your next renewal.</li>
        </ul>
      </section>
      <section>
        <h2>Acceptable use</h2>
        <p>
          You may not use the service to break the law, infringe the rights of others, distribute malware, attempt to
          access data that is not yours, or disrupt the service. We may suspend an account that does.
        </p>
      </section>
      <section>
        <h2>Your content</h2>
        <p>
          You keep ownership of the content you and your clients add. You give us the right to store and process it
          only as needed to run the service for you.
        </p>
      </section>
      <section>
        <h2>Ending the service</h2>
        <p>
          You can stop using Opprine and cancel at any time. We may terminate or suspend access for a breach of these
          terms. After termination we delete or anonymise account data within a reasonable period, except where we
          must keep records by law.
        </p>
      </section>
      <section>
        <h2>Availability and liability</h2>
        <p>
          The service is provided as is. To the extent the law allows, we are not liable for indirect or consequential
          loss, and our total liability for any claim is limited to the fees you paid for the service in the three
          months before the claim arose.
        </p>
      </section>
      <section>
        <h2>Governing law</h2>
        <p>These terms are governed by the laws of India.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          {business.name}
          <br />
          {business.address}
          <br />
          {business.supportEmail}
        </p>
      </section>
    </LegalPage>
  )
}