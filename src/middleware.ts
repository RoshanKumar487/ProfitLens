
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const idToken = request.cookies.get('firebaseIdToken')?.value

  const requestHeaders = new Headers(request.headers)
  if (idToken) {
    requestHeaders.set('x-firebase-id-token', idToken)
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: ['/ai-assistant/:path*', '/api/:path*'],
}
