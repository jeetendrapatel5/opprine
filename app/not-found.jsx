import Link from 'next/link'
import { Brand } from '@/components/landing/ui'

export default function NotFound() {
  return (
    <main className="fp-portal-theme grid min-h-screen place-items-center bg-fp-portal-bg px-4 py-12 text-fp-portal-text-primary">
      <div className="w-full max-w-md space-y-4">
        <Brand />
        <h1 className="text-4xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-fp-portal-text-secondary">Check the address or return to the Opprine homepage.</p>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-lg bg-fp-portal-accent-strong px-3 font-semibold text-white hover:bg-fp-portal-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fp-portal-accent-strong">
          Back to Opprine
        </Link>
      </div>
    </main>
  )
}
