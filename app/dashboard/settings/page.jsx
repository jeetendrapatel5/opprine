// app/dashboard/settings/page.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PSYCHOLOGICAL GOAL: The freelancer opens this page and feels like they are
// "making Freeport theirs" — not configuring a system. The copy, layout, and
// visual weight all reinforce: this is your brand, your portal, your identity.
//
// This is the Endowment Effect in practice: possessive language ("your portal",
// "your clients see this") increases the psychological switching cost.
//
// LAYOUT:
//   Full-width breadcrumb bar (same pattern as project page)
//   Narrow content column (max-w-xl) — settings should never feel overwhelming
//   Page title + subtitle (sets expectation before the form)
//   SettingsForm (the actual work)
//
// Server Component — fetches user data, passes to SettingsForm (Client Component).
// ─────────────────────────────────────────────────────────────────────────────

import { getServerSession } from 'next-auth'
import { authOptions }      from '@/app/api/auth/[...nextauth]/route'
import { redirect }         from 'next/navigation'
import prisma               from '@/lib/prisma'
import Link                 from 'next/link'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import SettingsForm         from '@/components/dashboard/SettingsForm'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/signin')

  // Fetch fresh from DB — session may not carry bio/avatarUrl/portfolioUrl
  // because these fields were added after some sessions were created.
  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: {
      id:           true,
      name:         true,
      email:        true,
      bio:          true,
      avatarUrl:    true,
      portfolioUrl: true,
      username:     true,
      profileEnabled: true,
      profileTagline: true,
    },
  })

  return (
    <div className="pb-24">

      {/* ── Breadcrumb bar ── same pattern as project page ── */}
      <div className="bg-transparent -mx-4 sm:-mx-6 px-4 sm:px-6 mb-8">
        <div className="max-w-7xl mx-auto h-11 flex items-center gap-1.5 text-xs font-medium">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-fp-text-tertiary hover:text-fp-text-secondary transition-colors duration-150"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-fp-border" />
          <span className="text-fp-text-secondary">Settings</span>
        </div>
      </div>

      {/* ── Content column ── narrow — settings shouldn't feel overwhelming ── */}
      <div className="max-w-xl mx-auto">

        {/* Page title */}
        <div className="mb-10">
          <h1 className="font-display text-center text-3xl font-medium text-fp-text-primary tracking-tight leading-tight">
            Your Profile
          </h1>
          {/* Possessive language — this is YOURS, not a system configuration */}
          <p className="text-fp-text-secondary text-sm mt-2 leading-relaxed">
            This appears on your client portal. It's how clients know who's building their project.
          </p>
        </div>

        <SettingsForm user={user} />

      </div>
    </div>
  )
}