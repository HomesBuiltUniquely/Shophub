export const SESSION_COOKIE = 'shophub_session';
export const CRM_TOKEN_COOKIE = 'shophub_crm_token';
export const DESIGN_TOKEN_COOKIE = 'shophub_design_token';

export type PortalRole = 'admin' | 'enterprise' | 'client' | 'crm' | 'designer';

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: PortalRole;
  brand?: string;
  loginSource?: 'catalog' | 'internal';
  leadId?: string;
};

export function encodeSession(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user), 'utf8').toString('base64url');
}

function decodeBase64Url(value: string) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64url').toString('utf8');
  }
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const withPad = padded + '='.repeat((4 - (padded.length % 4)) % 4);
  return atob(withPad);
}

export function decodeSession(value?: string | null): SessionUser | null {
  if (!value) return null;
  try {
    const json = decodeBase64Url(value);
    const user = JSON.parse(json) as SessionUser;
    const validRoles: PortalRole[] = ['admin', 'enterprise', 'client', 'crm', 'designer'];
    if (!user?.id || !validRoles.includes(user.role)) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === 'production',
  };
}

export function redirectForRole(role: PortalRole) {
  if (role === 'client') return '/client';
  if (role === 'crm' || role === 'designer') return '/quote-engine';
  return '/offerings';
}

export function canManageCatalog(role?: PortalRole | null) {
  return role === 'admin' || role === 'enterprise' || role === 'crm' || role === 'designer';
}

export function canBulkEditCatalog(user?: SessionUser | null) {
  return user?.role === 'admin' || user?.role === 'enterprise';
}

export function canDeleteCatalog(user?: SessionUser | null) {
  return user?.role === 'admin';
}

export function isInternalStaff(user?: SessionUser | null) {
  return user?.loginSource === 'internal' || user?.role === 'crm' || user?.role === 'designer';
}

export function isInternalAllowedPath(pathname: string) {
  if (pathname.startsWith('/api/')) return true;
  if (pathname.startsWith('/offerings/CreateOfferings')) return false;
  return (
    pathname.startsWith('/offerings') ||
    pathname.startsWith('/enterprise/offerings') ||
    pathname.startsWith('/quote-engine') ||
    pathname.startsWith('/quote-making') ||
    pathname.startsWith('/quote-invoice') ||
    pathname.startsWith('/offering-invoice') ||
    pathname === '/' ||
    pathname === '/login'
  );
}

export function isEnterprisePath(pathname: string) {
  return (
    pathname.startsWith('/offerings') ||
    pathname.startsWith('/enterprise') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/brands') ||
    pathname.startsWith('/categories') ||
    pathname.startsWith('/quote-engine') ||
    pathname.startsWith('/quote-making') ||
    pathname.startsWith('/offering-invoice') ||
    pathname.startsWith('/master-catalog') ||
    pathname.startsWith('/import') ||
    pathname.startsWith('/settings')
  );
}

export function isClientPath(pathname: string) {
  return pathname.startsWith('/client');
}
