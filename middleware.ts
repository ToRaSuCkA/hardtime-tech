import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only protect /admin routes (not the login page or login API)
  const isAdminRoute = pathname.startsWith('/admin')
  const isLoginPage  = pathname === '/admin/login'
  const isLoginApi   = pathname === '/api/admin/login'
  const isLogoutApi  = pathname === '/api/admin/logout'

  if (isLoginApi || isLogoutApi) return NextResponse.next()

  if (isAdminRoute && !isLoginPage) {
    const token  = req.cookies.get('ht_admin')?.value
    const secret = process.env.ADMIN_SECRET
    if (!secret || token !== secret) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
