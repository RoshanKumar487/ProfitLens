
import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/session';

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith('/auth');

  if (isAuthPage) {
    if (sessionCookie) {
       const session = await getSession();
       if (session) {
         return NextResponse.redirect(new URL('/dashboard', request.url));
       }
    }
    return NextResponse.next();
  }

  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
  
  // Verify the session is still valid
  const session = await getSession();
  if (!session) {
      const response = NextResponse.redirect(new URL('/auth/signin', request.url));
      // Clear the invalid cookie
      response.cookies.delete('session');
      return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
