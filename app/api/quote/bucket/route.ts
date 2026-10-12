import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth/account';
import {
  getAdminCustomersAndProjects,
  getCrmBucketCustomersAndProjects,
  getDesignBucketCustomersAndProjects,
} from '@/lib/api/leads.service';
import { CRM_TOKEN_COOKIE, DESIGN_TOKEN_COOKIE } from '@/lib/auth/session';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  const jar = await cookies();
  const crmToken = jar.get(CRM_TOKEN_COOKIE)?.value;
  const designToken = jar.get(DESIGN_TOKEN_COOKIE)?.value;
  const liveOnly = user.loginSource === 'internal';

  let data;
  if (user.role === 'crm') {
    data = await getCrmBucketCustomersAndProjects(crmToken, { fallback: !liveOnly });
  } else if (user.role === 'designer') {
    data = await getDesignBucketCustomersAndProjects(designToken, { fallback: !liveOnly });
  } else if (user.role === 'enterprise') {
    data = { customers: [], projects: [] };
  } else {
    data = await getAdminCustomersAndProjects();
  }

  return NextResponse.json(data);
}
