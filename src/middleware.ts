
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from './lib/constants';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/invoicing',
  '/employees',
  '/reports',
  '/settings',
  '/admin',
  '/company-details',
  '/expense-analyzer',
  '/record-expenses',
  '/record-revenue',
  '/payroll',
  '/products-services',
  '/ai-assistant',
];

const AUTH_ROUTES = [
  '/auth/signin',
  '/auth/signup',
  '/auth/signup-details',
  '/auth/forgot-password',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

  if (isAuthRoute) {
    if (sessionCookie) {
      // User is logged in, redirect from auth pages to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // User is not logged in, allow access to auth pages
    return NextResponse.next();
  }

  if (isProtectedRoute) {
    if (!sessionCookie) {
      // User is not logged in, redirect from protected pages to signin
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
  }

  // Allow access to public pages or already verified protected pages
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
