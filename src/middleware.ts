
import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || 'your-super-secret-key-that-is-at-least-32-chars-long');

const PUBLIC_ROUTES = ['/auth/signin', '/auth/signup'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for API routes, Next.js assets, etc.
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('session')?.value;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  if (!sessionCookie) {
    if (isPublicRoute) {
      return NextResponse.next();
    }
    // Redirect to sign-in page if no session and trying to access a protected route
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  try {
    await jwtVerify(sessionCookie, secretKey, { algorithms: ['HS256'] });
    
    // If user is authenticated and tries to access a public route (like signin), redirect to dashboard
    if (isPublicRoute) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    return NextResponse.next();
  } catch (err) {
    // If token is invalid, clear the cookie and redirect to sign-in
    const response = NextResponse.redirect(new URL('/auth/signin', request.url));
    response.cookies.delete('session');
    return response;
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
