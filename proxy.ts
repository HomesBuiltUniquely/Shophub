import { NextResponse, type NextRequest } from 'next/server';
import {
  decodeSession,
  isEnterprisePath,
  redirectForRole,
  SESSION_COOKIE,
} from '@/lib/auth/session';

const PUBLIC_PATHS = ['/', '/login', '/api/auth/login', '/api/auth/logout'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (!session && !isPublic) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session?.role === 'client' && isEnterprisePath(pathname)) {
    return NextResponse.redirect(new URL('/client', request.url));
  }

  if ((session?.role === 'enterprise' || session?.role === 'admin') && pathname.startsWith('/client')) {
    return NextResponse.redirect(new URL(redirectForRole(session.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:png|jpg|jpeg|gif|svg|webp)$).*)'],
};
