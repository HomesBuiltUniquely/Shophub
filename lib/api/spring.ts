export const SPRING_BOOT_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';
export const SPRING_TOKEN_COOKIE = 'shophub_spring_token';

function springOrigin() {
  return SPRING_BOOT_BASE_URL.replace(/\/api\/v1\/?$/, '');
}

export function jwtUnexpired(token?: string | null): token is string {
  if (!token) return false;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now() + 15_000;
  } catch {
    return false;
  }
}

function tokenFromLoginBody(data: any): string | null {
  const token =
    data?.token ||
    data?.accessToken ||
    data?.access_token ||
    data?.jwt ||
    data?.data?.token ||
    data?.data?.accessToken;
  return typeof token === 'string' && token ? token : null;
}

export async function loginSpring(username: string, password: string): Promise<string | null> {
  const bodies = [
    { username, password },
    { email: username, password },
    { username, email: username, password },
  ];
  for (const body of bodies) {
    try {
      const res = await fetch(`${springOrigin()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      const header = res.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || null;
      const token = tokenFromLoginBody(data) || header;
      if (token) {
        cachedServiceToken = token;
        return token;
      }
    } catch {
      /* try next login body */
    }
  }
  return null;
}

let cachedServiceToken: string | null = null;

export async function getServiceSpringToken(): Promise<string | null> {
  if (jwtUnexpired(cachedServiceToken)) return cachedServiceToken;
  const envToken = process.env.NEXT_PUBLIC_API_BEARER_TOKEN || process.env.API_BEARER_TOKEN;
  if (jwtUnexpired(envToken)) return envToken;
  const user = process.env.SPRING_AUTH_USERNAME || process.env.SPRING_AUTH_EMAIL;
  const pass = process.env.SPRING_AUTH_PASSWORD;
  if (user && pass) {
    const token = await loginSpring(user, pass);
    if (token) return token;
  }
  // Still attach the configured bearer so writes match the curl Authorization header.
  return envToken || cachedServiceToken || null;
}

function springHeaders(token?: string | null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function trySpringGet(path: string, token?: string | null) {
  const auth = token !== undefined ? token : await getServiceSpringToken();
  try {
    const springRes = await fetch(`${SPRING_BOOT_BASE_URL}${path}`, {
      method: 'GET',
      headers: springHeaders(auth),
      cache: 'no-store',
    });
    const springText = await springRes.text();
    let springJson: any = null;
    try {
      springJson = springText ? JSON.parse(springText) : null;
    } catch {
      springJson = { raw: springText };
    }
    return { ok: springRes.ok, status: springRes.status, data: springJson };
  } catch (err: any) {
    return { ok: false, status: 502, data: { error: err.message } };
  }
}

export function springProductPage(data: any): { content: any[]; totalElements: number; totalPages: number } {
  const payload = data?.content ? data : data?.data || data?.page || data || {};
  const content = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.content)
      ? payload.content
      : Array.isArray(payload.products)
        ? payload.products
        : [];
  const totalElements = Number(payload.totalElements ?? payload.total ?? content.length);
  const totalPages = Number(payload.totalPages ?? Math.max(1, Math.ceil(totalElements / Math.max(content.length, 1))));
  return { content, totalElements, totalPages };
}

export async function fetchSpringProducts(options?: {
  isPublished?: boolean | null;
  page?: number;
  size?: number;
  sort?: string;
}) {
  const page = options?.page ?? 0;
  const size = options?.size ?? 100;
  const sort = options?.sort ?? 'prodId,asc';
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort,
  });
  if (options?.isPublished != null) params.set('is_published', String(options.isPublished));
  return trySpringGet(`/products/getAllProducts?${params.toString()}`);
}

export async function fetchAllSpringProducts(options?: {
  isPublished?: boolean | null;
  size?: number;
  sort?: string;
}) {
  const collected: any[] = [];
  let totalElements = 0;
  const publishedValues =
    options?.isPublished == null ? ([true, false] as const) : ([options.isPublished] as const);
  for (const published of publishedValues) {
    let page = 0;
    let totalPages = 1;
    do {
      const spring = await fetchSpringProducts({
        isPublished: published,
        page,
        size: options?.size ?? 100,
        sort: options?.sort ?? 'prodId,asc',
      });
      if (!spring.ok) break;
      const parsed = springProductPage(spring.data);
      collected.push(...parsed.content);
      totalElements = Math.max(totalElements, parsed.totalElements);
      totalPages = parsed.totalPages || 1;
      page += 1;
    } while (page < totalPages && page < 20);
  }
  return collected;
}

export async function trySpring(path: string, payload: unknown, method = 'POST', token?: string | null) {
  const auth = token !== undefined ? token : await getServiceSpringToken();
  try {
    const springRes = await fetch(`${SPRING_BOOT_BASE_URL}${path}`, {
      method,
      headers: springHeaders(auth),
      body:
        payload === undefined || method === 'GET' || method === 'DELETE'
          ? undefined
          : JSON.stringify(payload),
    });
    const springText = await springRes.text();
    let springJson: unknown = null;
    try {
      springJson = springText ? JSON.parse(springText) : null;
    } catch {
      springJson = { raw: springText };
    }
    return { ok: springRes.ok, status: springRes.status, data: springJson };
  } catch (err: any) {
    return { ok: false, status: 502, data: { error: err.message } };
  }
}
