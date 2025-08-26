import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect workspace routes
  if (req.nextUrl.pathname.startsWith('/workspaces')) {
    if (!user) {
      const redirectUrl = new URL('/signin', req.url)
      redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Protect report editor if you want
  if (req.nextUrl.pathname === '/report') {
    if (!user) {
      const redirectUrl = new URL('/signin', req.url)
      redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return res
}

export const config = {
  matcher: [
    '/workspaces/:path*',
    '/report'
  ]
}
