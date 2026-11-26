// proxy.js
import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import { hasPaidAccess } from './lib/billing/paywall.js'
import { isPaywallExemptApi, PAYWALL_STATUS } from './lib/billing/paywall-rules.js'

export async function proxy(req) {
  const token = await getToken({ req })
  const isLoggedIn = !!token
  const path = req.nextUrl.pathname

  // If logged-in user visits the landing page, send them to dashboard
  if (path === '/' && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // If a non-logged-in user tries to visit /dashboard, send to signin
  if (path.startsWith('/dashboard') && !isLoggedIn) {
    return NextResponse.redirect(new URL('/signin', req.url))
  }

  // Signed-in API calls need a paid workspace. Each route still performs
  // its own authentication and authorization.
  if (path.startsWith('/api/') && isLoggedIn && token.id && !isPaywallExemptApi(path)) {
    let paid
    try {
      paid = await hasPaidAccess(token.id)
    } catch (error) {
      console.error('Paywall check failed:', error)
      return NextResponse.json({ error: 'Service temporarily unavailable.' }, { status: 503 })
    }
    if (!paid) {
      return NextResponse.json(
        { error: 'An active subscription is required.', code: 'SUBSCRIPTION_REQUIRED' },
        { status: PAYWALL_STATUS }
      )
    }
  }

  // The dashboard layout reads the path from this header to decide whether
  // an unpaid workspace may see the page.
  if (path.startsWith('/dashboard')) {
    const headers = new Headers(req.headers)
    headers.set('x-pathname', path)
    return NextResponse.next({ request: { headers } })
  }
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/api/:path*'],
}
