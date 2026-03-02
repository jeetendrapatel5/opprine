// app/portal/[token]/not-found.jsx

import Link from 'next/link'

export default function PortalNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-4xl mb-4">🔗</p>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Invalid or Expired Link
        </h1>
        <p className="text-gray-500 text-sm max-w-sm">
          This portal link is not valid. Please ask your freelancer
          to send you the correct link.
        </p>
      </div>
    </div>
  )
}