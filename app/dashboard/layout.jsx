import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { Settings } from 'lucide-react'

export default async function DashboardLayout({ children }) {

  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/signin')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={session.user} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
        {children}
      </main>
    </div>
  )
}