// app/privacy/page.jsx

import LegalPage from '@/components/legal/LegalPage'
import { getBusinessDetails } from '@/lib/legal/business'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Privacy Policy | Opprine' }

export default function PrivacyPage() {
  const business = getBusinessDetails()

  return (
    <LegalPage title="Privacy Policy" updated="25 November 2026">
      <section>
        <h2>Who we are</h2>
        <p>
          {business.name} operates Opprine and is responsible for the personal data described here.
        </p>
      </section>
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>Account data: your name, email address and sign-in credentials.</li>
          <li>Workspace data: projects, tasks, clients, files, messages and approvals that you and your team add.</li>
          <li>Client portal data: activity of people who open a portal link you shared.</li>
          <li>Integration data: commit information from a GitHub repository you connect.</li>
          <li>
            Billing data: your plan, subscription status, and payment identifiers, amounts and statuses reported by
            Razorpay. Card and bank details are entered with Razorpay and are not stored by us.
          </li>
        </ul>
      </section>
      <section>
        <h2>How we use it</h2>
        <p>
          To provide and secure the service, process payments, send service emails such as invites, reminders and
          billing notices, and investigate abuse or errors. We do not sell personal data.
        </p>
      </section>
      <section>
        <h2>Who processes it</h2>
        <p>
          We use service providers to run Opprine: Razorpay for payments, an email delivery provider, and our hosting
          and database providers. They process data only to provide those services. Your data may be processed in
          countries other than your own.
        </p>
      </section>
      <section>
        <h2>Retention</h2>
        <p>
          We keep account and workspace data while your account exists. Payment records are kept for as long as
          financial and tax rules require. Raw payment-event payloads received from Razorpay are cleared after 90 days.
        </p>
      </section>
      <section>
        <h2>Your rights</h2>
        <p>
          You can ask to access, correct, export or delete your personal data, and to object to or restrict some uses,
          by writing to {business.supportEmail}. If you believe we have handled your data unlawfully you may also
          complain to your local data protection authority.
        </p>
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
