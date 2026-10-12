import { encodeSession, type PortalRole, type SessionUser } from './session';

const HOWS_LOGIN_URL =
  process.env.HOWS_AUTH_URL || 'https://hows.hubinterior.com/api/auth/login';
const DESIGN_LOGIN_URL =
  process.env.DESIGN_AUTH_URL || 'https://api.hubinterior.com/api/auth/login';

type HubLoginHit = {
  ok: boolean;
  role?: PortalRole;
  user?: SessionUser;
  crmToken?: string;
  designToken?: string;
};

function pickToken(data: Record<string, unknown> | null): string | null {
  if (!data) return null;
  const nested = (data.data && typeof data.data === 'object' ? data.data : {}) as Record<string, unknown>;
  const user = (data.user && typeof data.user === 'object' ? data.user : {}) as Record<string, unknown>;
  const candidates = [
    data.token,
    data.sessionId,
    data.session_id,
    data.accessToken,
    data.access_token,
    nested.token,
    nested.sessionId,
    user.token,
    user.sessionId,
  ];
  const token = candidates.find((value) => typeof value === 'string' && value.trim());
  return token ? String(token).trim() : null;
}

function howsRole(raw?: unknown): PortalRole {
  const role = String(raw || '').toUpperCase();
  if (['DESIGN', 'DESIGNER', 'INTERIOR_DESIGNER'].includes(role)) return 'designer';
  return 'crm';
}

function designRole(raw?: unknown): PortalRole {
  const role = String(raw || '').toUpperCase();
  if (['CRM', 'SALES', 'AGENT', 'EXECUTIVE', 'CRM_SPECIALIST'].includes(role)) return 'crm';
  return 'designer';
}

async function postJson(url: string, body: Record<string, string>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  return { ok: res.ok, status: res.status, data };
}

async function loginHows(identifier: string, password: string): Promise<HubLoginHit> {
  const { ok, data } = await postJson(HOWS_LOGIN_URL, { username: identifier, password });
  const token = pickToken(data);
  if (!ok || !token) return { ok: false };
  const user = (data?.user || {}) as Record<string, unknown>;
  const email = String(user.email || identifier);
  const name = String(user.username || user.name || email);
  const role = howsRole(user.role);
  const session: SessionUser = {
    id: Number(user.id || 0) || Number(Date.now()),
    email,
    name,
    role,
    loginSource: 'internal',
  };
  return { ok: true, role, user: session, crmToken: token };
}

async function loginDesign(identifier: string, password: string): Promise<HubLoginHit> {
  const { ok, data } = await postJson(DESIGN_LOGIN_URL, { email: identifier, password });
  const token = pickToken(data);
  if (!ok || !token) return { ok: false };
  const user = (data?.user || {}) as Record<string, unknown>;
  const email = String(user.email || identifier);
  const name = String(user.name || user.username || email);
  const role = designRole(user.role);
  const session: SessionUser = {
    id: Number(user.id || 0) || Number(Date.now()),
    email,
    name,
    role,
    loginSource: 'internal',
  };
  return { ok: true, role, user: session, designToken: token };
}

export async function authenticateInternalUser(identifier: string, password: string) {
  const trimmed = identifier.trim();
  const [hows, design] = await Promise.all([
    loginHows(trimmed, password).catch(() => ({ ok: false } as HubLoginHit)),
    loginDesign(trimmed, password).catch(() => ({ ok: false } as HubLoginHit)),
  ]);

  if (!hows.ok && !design.ok) {
    throw new Error('Invalid sales or design credentials.');
  }

  const preferDesign = trimmed.includes('@');
  const chosen =
    hows.ok && design.ok ? (preferDesign ? design : hows) : hows.ok ? hows : design;

  const session = chosen.user!;
  return {
    session,
    token: encodeSession(session),
    crmToken: hows.crmToken,
    designToken: design.designToken,
  };
}
