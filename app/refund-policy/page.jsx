// app/refund-policy/page.jsx

import LegalPage from '@/components/legal/LegalPage'
import { getBusinessDetails } from '@/lib/legal/business'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Cancellation and Refund Policy | Opprine' }

export default function RefundPolicyPage() {
  const business = getBusinessDetails()

  return (
    <LegalPage title="Cancellation and Refund Policy" updated="25 November 2026">
      <section>
        <h2>Billing</h2>
        <p>
          Opprine requires a paid subscription; there is no free plan or free trial. Plans are billed in advance in US
          dollars, monthly, through Razorpay. A subscription renews automatically at the end of each period until you
          cancel it.
        </p>
      </section>
      <section>
        <h2>Cancelling</h2>
        <p>
          The workspace owner can cancel at any time from Billing in the dashboard. By default a cancellation takes
          effect at the end of the period you have already paid for, and you keep your plan until then. You can
          instead choose to cancel immediately, in which case paid access ends right away. After a subscription ends
          the workspace cannot be used until a new subscription is started. Your data is kept.
        </p>
      </section>
      <section>
        <h2>Refunds</h2>
        <p>
          Fees for a period that has started are not refundable. We refund in full any charge made in error, including
          a duplicate charge, or a payment taken for a subscription that was not activated on your workspace. To
          request one, write to {business.supportEmail} from the account email, with the payment reference, within 30
          days of the charge.
        </p>
      </section>
      <section>
        <h2>How refunds are paid</h2>
        <p>
          Approved refunds are returned to the original payment method through Razorpay. The time for the money to
          reach you depends on your bank or card issuer, and is commonly 5 to 7 business days. Because plans are billed in US dollars, the amount you receive may differ slightly because of your
          issuer&apos;s exchange rate.
        </p>
      </section>
      <section>
        <h2>Failed renewals</h2>
        <p>
          If a renewal payment fails, Razorpay retries it. Your plan continues for up to 7 days after the unpaid period
          ends. If the payment still has not succeeded, access to the workspace is suspended until a payment succeeds.
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
