
import { NextResponse, type NextRequest } from 'next/server';

// This middleware is now bypassed to allow access without real authentication.
export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
