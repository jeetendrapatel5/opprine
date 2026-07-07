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
  const { label, icon: Icon, description } = SECTIONS[activeSection]

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

function BankAccountsPlaceholder({ bankAccounts }) {
  const bankCount = bankAccounts?.length ?? 0

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fp-text-tertiary">
            Payout settings
          </p>
          <h2 className="mt-1 font-display text-2xl font-medium tracking-tight text-fp-text-primary sm:text-[28px]">
            Bank details
          </h2>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-fp-border bg-fp-surface px-3 py-1.5 text-[11px] font-semibold text-fp-text-secondary">
          <Landmark size={12} className="text-fp-text-tertiary" />
          {bankCount ? `${bankCount} account${bankCount === 1 ? '' : 's'} linked` : 'No payout accounts linked'}
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-fp-border bg-fp-surface/50 px-5 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-fp-border bg-fp-raised">
            <Landmark size={20} className="text-fp-text-tertiary" />
          </div>

          <h3 className="mt-4 text-sm font-semibold text-fp-text-primary sm:text-base">
            Bank account management is coming soon
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-fp-text-secondary">
            You will be able to add payout accounts, choose a default, and manage currencies from here.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-fp-text-tertiary">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-fp-border bg-fp-base px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-fp-success" />
              Ready for setup
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-fp-border bg-fp-base px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-fp-accent" />
              Connected to workspace
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
