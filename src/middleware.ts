
import { NextResponse, type NextRequest } from 'next/server';

// This is a minimal middleware function to satisfy the Next.js requirement.
// Since the application has no backend authentication, it simply passes all requests through.
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

// We explicitly configure the matcher to an empty array to ensure
// this middleware does not run on any path, further minimizing its impact.
export const config = {
  matcher: [],
};
