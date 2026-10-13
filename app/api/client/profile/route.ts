import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/account';
import { EMPTY_CLIENT_PROFILE } from '@/lib/client/client-profile';
import { getClientSavedProfile, saveClientSavedProfile } from '@/lib/client/client-profile-archive';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = getSessionFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  const saved = await getClientSavedProfile(user.email);
  return NextResponse.json({
    profile: {
      ...EMPTY_CLIENT_PROFILE,
      email: user.email,
      displayName: user.name,
      ...saved,
    },
  });
}

export async function PUT(request: NextRequest) {
  const user = getSessionFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const profile = await saveClientSavedProfile(user.email, body);
  return NextResponse.json({ profile });
}
