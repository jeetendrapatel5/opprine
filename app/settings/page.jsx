import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth"
import { redirect } from 'next/navigation'


export default function SettingsPage() {
    const session = getServerSession(authOptions)

    if (!session) {
        redirect('/signin')
    }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Coming soon...</p>
      </div>
    </div>
  )
}