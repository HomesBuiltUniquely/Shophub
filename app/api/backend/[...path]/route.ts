import { NextRequest, NextResponse } from 'next/server';
import { SPRING_BOOT_BASE_URL, SPRING_TOKEN_COOKIE, getServiceSpringToken } from '@/lib/api/spring';

export const dynamic = 'force-dynamic';

async function proxy(request: NextRequest, path: string[]) {
  const joined = `/${path.map(encodeURIComponent).join('/')}`;
  const url = `${SPRING_BOOT_BASE_URL}${joined}${request.nextUrl.search}`;
  const token = request.cookies.get(SPRING_TOKEN_COOKIE)?.value || (await getServiceSpringToken());
  const headers: Record<string, string> = {
    Accept: request.headers.get('accept') || 'application/json',
  };
  const contentType = request.headers.get('content-type');
  if (contentType) headers['Content-Type'] = contentType;
  if (token) headers.Authorization = `Bearer ${token}`;

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  try {
    const res = await fetch(url, init);
    const body = await res.arrayBuffer();
    const responseHeaders = new Headers();
    const resType = res.headers.get('content-type');
    if (resType) responseHeaders.set('Content-Type', resType);
    return new NextResponse(body, { status: res.status, headers: responseHeaders });
  } catch (err) {
    console.error('[api/backend]', url, err);
    return NextResponse.json({ error: 'Catalog backend unreachable.' }, { status: 502 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(request, path);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(request, path);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(request, path);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(request, path);
}
