import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { getHomesMerryDbPool } from '@/lib/db/homesmerry';
import { decodeSession, encodeSession, SESSION_COOKIE, sessionCookieOptions, type PortalRole, type SessionUser } from './session';
import { verifyPassword } from './password';
import { ensureAuthSchema } from './ensure';

function mapPortalRole(raw?: string | null): PortalRole | null {
  const role = String(raw || '').toUpperCase();
  if (['RETAIL_CUSTOMER', 'INTERIOR_CLIENT'].includes(role)) return 'client';
  if (['ADMIN', 'SUPER_ADMIN'].includes(role)) return 'admin';
  if (['CRM', 'SALES', 'AGENT', 'EXECUTIVE', 'CRM_SPECIALIST'].includes(role)) return 'crm';
  if (['DESIGN', 'DESIGNER', 'INTERIOR_DESIGNER'].includes(role)) return 'designer';
  if (['ENTERPRISE', 'VENDOR', 'BRAND', 'SELLER'].includes(role)) return 'enterprise';
  return null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  return decodeSession(jar.get(SESSION_COOKIE)?.value);
}

export function getSessionFromRequest(request: NextRequest): SessionUser | null {
  return decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
}

export async function authenticateUser(email: string, password: string) {
  await ensureAuthSchema();
  const pool = getHomesMerryDbPool();
  const normalized = email.trim().toLowerCase();

  const [userRows]: any = await pool.query(
    `SELECT uuid, email, password, first_name, last_name, role, brand_name
     FROM user
     WHERE LOWER(email) = ?
     LIMIT 1`,
    [normalized]
  );
  let row = Array.isArray(userRows) ? userRows[0] : null;

  if (!row) {
    const [loginRows]: any = await pool.query(
      `SELECT username AS email, password, role
       FROM login
       WHERE LOWER(username) = ?
       ORDER BY login_id ASC
       LIMIT 1`,
      [normalized]
    );
    row = Array.isArray(loginRows) ? loginRows[0] : null;
  }

  if (!row || !(await verifyPassword(password, row.password))) {
    throw new Error('Invalid username or password.');
  }

  const mapped = mapPortalRole(row.role);
  if (!mapped) {
    throw new Error('This account has no assigned workspace.');
  }

  await pool.query(
    `INSERT INTO login (username, password, role, logintime) VALUES (?, ?, ?, NOW())`,
    [row.email || normalized, row.password, row.role || mapped.toUpperCase()]
  );

  const session: SessionUser = {
    id: Number(row.uuid || 0) || Number(Date.now()),
    email: row.email || normalized,
    name: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email || 'User',
    role: mapped,
    brand: row.brand_name || undefined,
    loginSource: 'catalog',
  };

  return { session, token: encodeSession(session) };
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 });
}
