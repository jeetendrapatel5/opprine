// middleware.js
import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'

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
}

export const config = {
  matcher: ['/', '/dashboard/:path*']
}
