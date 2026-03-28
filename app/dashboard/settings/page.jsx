// app/dashboard/settings/page.jsx

import { getServerSession } from 'next-auth'
import { authOptions }      from '@/app/api/auth/[...nextauth]/route'
import { redirect }         from 'next/navigation'
import prisma               from '@/lib/prisma'
import Link                 from 'next/link'
import { ArrowLeft }        from 'lucide-react'
import SettingsForm         from '@/components/dashboard/SettingsForm'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/signin')

  // Fetch fresh user data — session may not have bio/avatarUrl/portfolioUrl
  // because those fields were added after the session was created
  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: {
      id:           true,
      name:         true,
      email:        true,
      bio:          true,
      avatarUrl:    true,
      portfolioUrl: true,
    },
  })

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24">

      {/* Breadcrumb */}
      <div className="border-b border-slate-200/60 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-2 text-sm font-medium text-slate-500">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900">Settings</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Profile Settings
          </h1>
          <p className="mt-1.5 text-slate-500 text-sm">
            This information appears on your client portal so clients know who they're working with.
          </p>
        </div>

        <SettingsForm user={user} />
      </div>
    </div>
  )
}