import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth/account';
import { authenticateInternalUser } from '@/lib/auth/internal-hub';
import { loginSpring, SPRING_TOKEN_COOKIE } from '@/lib/api/spring';
import {
  CRM_TOKEN_COOKIE,
  DESIGN_TOKEN_COOKIE,
  redirectForRole,
  SESSION_COOKIE,
  sessionCookieOptions,
} from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || body.username || '').trim();
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required.' },
        { status: 400 }
      );
    }

    let catalog: Awaited<ReturnType<typeof authenticateUser>> | null = null;
    let internal: Awaited<ReturnType<typeof authenticateInternalUser>> | null = null;

    try {
      catalog = await authenticateUser(email, password);
    } catch {
      catalog = null;
    }

    if (!catalog) {
      try {
        internal = await authenticateInternalUser(email, password);
      } catch {
        internal = null;
      }
    }

    const result = catalog || internal;
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: result.session,
      redirect: redirectForRole(result.session.role),
    });
    const cookie = sessionCookieOptions();
    response.cookies.set(SESSION_COOKIE, result.token, cookie);
    response.cookies.set(CRM_TOKEN_COOKIE, '', { ...cookie, maxAge: 0 });
    response.cookies.set(DESIGN_TOKEN_COOKIE, '', { ...cookie, maxAge: 0 });

    if (internal && !catalog) {
      if (internal.crmToken) {
        response.cookies.set(CRM_TOKEN_COOKIE, internal.crmToken, cookie);
      }
      if (internal.designToken) {
        response.cookies.set(DESIGN_TOKEN_COOKIE, internal.designToken, cookie);
      }
    } else {
      const springToken = await loginSpring(email, password);
      if (springToken) {
        response.cookies.set(SPRING_TOKEN_COOKIE, springToken, cookie);
      }
    }
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Unable to sign in.' },
      { status: 401 }
    );
  }
}
