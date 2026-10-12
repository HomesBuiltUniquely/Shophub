import { NextResponse } from 'next/server';
import { SPRING_TOKEN_COOKIE } from '@/lib/api/spring';
import {
  CRM_TOKEN_COOKIE,
  DESIGN_TOKEN_COOKIE,
  SESSION_COOKIE,
  sessionCookieOptions,
} from '@/lib/auth/session';

export async function POST() {
  const response = NextResponse.json({ success: true, redirect: '/login' });
  const expired = { ...sessionCookieOptions(), maxAge: 0 };
  response.cookies.set(SESSION_COOKIE, '', expired);
  response.cookies.set(SPRING_TOKEN_COOKIE, '', expired);
  response.cookies.set(CRM_TOKEN_COOKIE, '', expired);
  response.cookies.set(DESIGN_TOKEN_COOKIE, '', expired);
  return response;
}
