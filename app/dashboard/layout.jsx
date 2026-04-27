// app/dashboard/layout.jsx
// ─────────────────────────────────────────────────────────────────────────────
// This is a Server Component — it runs on the server, checks auth, and wraps
// all /dashboard/* pages. The Navbar itself is a Client Component (needs
// signOut interactivity), but this layout shell is server-rendered.
//
// Psychology: The dark bg-fp-base background is set HERE, not in globals.css,
// because only the dashboard is dark. The portal (/portal/*) will be light.
// Keeping themes scoped to their layout prevents bleed.
// ─────────────────────────────────────────────────────────────────────────────

import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'

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