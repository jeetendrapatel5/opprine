import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {

  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/signin')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session.user.name} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          Your plan: <span className="font-medium">{session.user.plan}</span>
        </p>
        <p className="text-gray-400 text-sm mt-4">
          Auth is working ✅ — Projects coming next.
        </p>
      </div>
    </div>
  )
}