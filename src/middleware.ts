// This middleware is no longer needed as Firebase Auth has been removed.
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [], // No routes matched
}
