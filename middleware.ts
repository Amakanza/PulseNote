// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { PrivacyLogger } from '@/lib/logging';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const startTime = Date.now();

  try {
    // Refresh session if expired - required for Server Components
    const { data: { session } } = await supabase.auth.getSession();

    // Log the request (without PII)
    const logData = {
      method: req.method,
      route: req.nextUrl.pathname,
      ip: req.ip || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      userAgent: req.headers.get('user-agent'),
      userId: session?.user?.id
    };

    // Protected routes that require authentication
    const protectedPaths = [
      '/workspaces',
      '/settings',
      '/api/workspaces',
      '/api/projects',
      '/api/invite'
    ];

    const isProtectedPath = protectedPaths.some(path => 
      req.nextUrl.pathname.startsWith(path)
    );

    // Check authentication for protected paths
    if (isProtectedPath && !session) {
      const redirectUrl = new URL('/signin', req.url);
      redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname);
      
      PrivacyLogger.info('Unauthorized access attempt', {
        ...logData,
        redirectTo: '/signin'
      });

      return NextResponse.redirect(redirectUrl);
    }

    // Update last active time for authenticated users
    if (session?.user?.id) {
      // This would be done in background, not blocking the request
      updateUserActivity(session.user.id, req);
    }

    // Security headers are set in next.config.js, but we can add dynamic ones here
    if (req.nextUrl.pathname.startsWith('/api/')) {
      res.headers.set('X-API-Version', '1.0');
      res.headers.set('X-Request-ID', crypto.randomUUID());
    }

    // Log successful request
    PrivacyLogger.info('Request processed', logData);

    return res;

  } catch (error) {
    console.error('Middleware error:', error);
    
    // Log the error (without sensitive details)
    PrivacyLogger.error('Middleware error', error as Error, {
      route: req.nextUrl.pathname,
      method: req.method
    });

    return res;
  }
}

// Background function to update user activity (would be async queue in production)
async function updateUserActivity(userId: string, req: NextRequest) {
  try {
    const { supabaseAdmin } = await import('@/lib/supabaseAdmin');
    
    await supabaseAdmin
      .from('user_sessions')
      .upsert({
        user_id: userId,
        device_name: getDeviceName(req.headers.get('user-agent') || ''),
        device_type: getDeviceType(req.headers.get('user-agent') || ''),
        ip_address: req.ip || req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        last_active: new Date().toISOString()
      }, {
        onConflict: 'user_id,ip_address',
        ignoreDuplicates: false
      });
  } catch (error) {
    // Fail silently - don't break the request for logging issues
    console.error('Failed to update user activity:', error);
  }
}

function getDeviceName(userAgent: string): string {
  if (userAgent.includes('Mobile')) return 'Mobile Device';
  if (userAgent.includes('Tablet')) return 'Tablet Device';  
  if (userAgent.includes('Windows')) return 'Windows Computer';
  if (userAgent.includes('Macintosh')) return 'Mac Computer';
  if (userAgent.includes('Linux')) return 'Linux Computer';
  return 'Unknown Device';
}

function getDeviceType(userAgent: string): string {
  if (userAgent.includes('Mobile')) return 'mobile';
  if (userAgent.includes('Tablet')) return 'tablet';
  return 'desktop';
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
