import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const userId = request.cookies.get('userId');
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/projects') || pathname.startsWith('/api/projects')) {
    if (!userId) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if (pathname === '/login' && userId) {
    return NextResponse.redirect(new URL('/projects', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/projects/:path*', '/api/projects/:path*', '/login', '/'],
};
