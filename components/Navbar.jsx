'use client'

import { signOut } from 'next-auth/react'
import Link from 'next/link'

export default function Navbar({ user }) {
  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link
          href="/dashboard"
          className="font-bold text-lg text-blue-600"
        >
          ClientPortal
        </Link>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {user.name}
          </span>

          <button
            onClick={() => signOut({ callbackUrl: '/signin' })}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            Logout
          </button>
        </div>

      </div>
    </nav>
  )
}