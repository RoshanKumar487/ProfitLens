
import { NextResponse, type NextRequest } from 'next/server';

// Middleware is disabled as authentication has been removed.
export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
