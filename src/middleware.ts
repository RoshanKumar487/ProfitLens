
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from './lib/constants';

// No longer need to protect routes since auth is removed.
// This middleware now simply passes all requests through.
export async function middleware(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE_NAME);
  const { pathname } = request.nextUrl;

  // If there's no session, and the user is trying to access a protected page, redirect to sign-in
  if (!session && !pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/sign-in';
    return NextResponse.redirect(url);
  }

  // If there is a session, and the user is on a public auth page, redirect to dashboard
  if (session && pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
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
