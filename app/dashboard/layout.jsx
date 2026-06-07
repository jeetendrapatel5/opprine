import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { VscHome, VscArchive, VscAccount, VscSettingsGear } from 'react-icons/vsc'

export default async function DashboardLayout({ children }) {

  // Auth guard — if no session, redirect to signin immediately.
  // This runs on the server so the page never renders for unauthenticated users.
  const session = await getServerSession(authOptions)
  if (!session) redirect('/signin')

  return (
    // min-h-screen ensures the dark background fills the full viewport
    // even when content is short (e.g. empty state with no projects)
    <div className="min-h-screen bg-fp-base font-body">

      {/* Navbar receives user data from session — server → client prop */}
      <Navbar user={session.user} />

      {/* Content area — max-w-5xl (1120px) is the sweet spot for a dashboard.
          Wider than this and the eye travels too far across a row.
          px-6 on mobile, no change on desktop — keeps content breathing. */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

    </div>
  )
}