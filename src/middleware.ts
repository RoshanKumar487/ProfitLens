
import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from './app/auth/actions';

export async function middleware(request: NextRequest) {
  const session = await getSession();
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith('/auth');

  if (isAuthPage) {
    // If the user is logged in and tries to access an auth page, redirect to dashboard
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // Otherwise, allow access to the auth page
    return NextResponse.next();
  }

  // If the user is not logged in and trying to access a protected page, redirect to sign-in
  if (!session) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
  
  // If the user is logged in, allow access to the protected page
  return NextResponse.next();
}

export const config = {
  // Match all routes except for API routes, static files, and image optimization files
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
