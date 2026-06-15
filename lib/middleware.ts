import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Middleware is currently handled by NextAuth on protected pages.
  // No global interception needed here.
  return NextResponse.next()
}

export const config = {
  /*
   * Only run middleware on dashboard and settings routes.
   * Explicitly leaves these routes untouched:
   *   /portal/[token]   — client magic-link portal (public)
   *   /showcase/[slug]  — public project showcase
   *   /u/[username]     — public freelancer profile
   *   /signin /signup   — auth pages
   *   /api/webhooks     — Stripe webhooks (no auth needed)
   */
  matcher: [
    '/dashboard/:path*',
    '/settings/:path*',
  ],
}