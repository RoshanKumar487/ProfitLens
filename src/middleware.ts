import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

const PROTECTED_ROUTES = ['/dashboard', '/invoicing', '/employees', '/settings', '/reports'];
const AUTH_ROUTES = ['/auth/sign-in', '/auth/sign-up'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    const session = await verifySession();
    
    // If user is authenticated
    if (session) {
      // and trying to access auth pages, redirect to dashboard
      if (AUTH_ROUTES.some(route => pathname.startsWith(route))) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      return NextResponse.next();
    }

    // If user is not authenticated
    // and trying to access a protected route, redirect to sign-in
    if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }
    
    return NextResponse.next();
  } catch (err) {
    console.error('Middleware error:', err);
    // If verification fails, redirect to sign-in for protected routes
    if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
        return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
