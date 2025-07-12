
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Use 'firebaseIdToken' to match what's set in AuthContext
  const idToken = request.cookies.get('firebaseIdToken')?.value

  const requestHeaders = new Headers(request.headers)
  if (idToken) {
    // Pass the token in a consistent header name
    requestHeaders.set('x-firebase-id-token', idToken)
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

// The matcher should only include routes that still use this API-style authentication.
// Since the employee search now uses a Server Action, it no longer needs to be here.
export const config = {
  matcher: ['/ai-assistant/:path*'],
}
