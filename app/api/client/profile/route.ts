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
  try {
    const saved = await getClientSavedProfile(user.email);
    return NextResponse.json({
      profile: {
        ...EMPTY_CLIENT_PROFILE,
        email: user.email,
        displayName: user.name,
        ...saved,
      },
    });
  } catch (err) {
    console.error('[client-profile GET]', err);
    return NextResponse.json({
      profile: {
        ...EMPTY_CLIENT_PROFILE,
        email: user.email,
        displayName: user.name,
      },
    });
  }
}

export async function PUT(request: NextRequest) {
  const user = getSessionFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  try {
    const profile = await saveClientSavedProfile(user.email, body);
    return NextResponse.json({ profile });
  } catch (err) {
    console.error('[client-profile PUT]', err);
    return NextResponse.json({ error: 'Could not save profile.' }, { status: 500 });
  }
}
