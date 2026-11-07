'use client'

import { useSearchParams } from 'next/navigation'
import { Landmark, User } from 'lucide-react'
import ProfileSection from './ProfileSection'
import BankDetailsSection from './BankDetailsSection'

const SECTIONS = {
  profile: {
    label: 'Profile',
    icon: User,
    description: 'Shape the identity that appears in your client portal and public profile.',
  },
  bank: {
    label: 'Bank Details',
    icon: Landmark,
    description: 'Review the payout accounts connected to your workspace.',
  },
}

export default function SettingsShell({ user, bankAccounts }) {
  const searchParams = useSearchParams()
  const activeSection = searchParams.get('section') === 'bank' ? 'bank' : 'profile'
  const { label, description } = SECTIONS[activeSection]

  return (
    <div className="min-h-screen bg-fp-base">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <header className="mb-6 sm:mb-8 ">
          <div className="mt-4 max-w-3xl space-y-2">
            <h1 className="font-display text-3xl font-medium tracking-tight text-fp-text-primary sm:text-4xl">
              {label}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-fp-text-secondary sm:text-base">
              {description}
            </p>
          </div>
        </header>

        <div className="space-y-6">
          {activeSection === 'profile' && <ProfileSection user={user} />}

          {activeSection === 'bank' && <BankDetailsSection bankAccounts={bankAccounts} />}
        </div>
      </div>
    </div>
  )
}
