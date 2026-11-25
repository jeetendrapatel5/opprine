// components/legal/LegalPage.jsx
//
// Shared layout for the legal pages. Server component.

import Link from 'next/link'

export default function LegalPage({ title, updated, children }) {
  return (
    <main className="min-h-screen bg-[#FBF8F2] text-[#17130F]">
      <div className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <Link href="/" className="text-[13px] font-semibold text-[#1E6F45] hover:underline">
          Opprine
        </Link>
        <h1 className="mt-6 font-display text-3xl font-semibold sm:text-4xl">{title}</h1>
        <p className="mt-2 text-[13px] text-[#6F675A]">Last updated: {updated}</p>
        <div className="mt-10 space-y-8 text-[15px] leading-7 text-[#3A342B] [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[#17130F] [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>
      </div>
    </main>
  )
}
