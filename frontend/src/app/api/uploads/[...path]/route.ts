import { NextResponse } from 'next/server';

const BACKEND_BASE = String(
  process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
).replace(/\/+$/, '');

export const runtime = 'nodejs';
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

function buildForwardHeaders(request: Request) {
  const headers = new Headers(request.headers);
  headers.delete('connection');
  headers.delete('content-length');
  headers.delete('host');
  return headers;
}

function buildResponseHeaders(upstream: Response) {
  const headers = new Headers();

  upstream.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey === 'connection' ||
      normalizedKey === 'content-encoding' ||
      normalizedKey === 'content-length' ||
      normalizedKey === 'keep-alive' ||
      normalizedKey === 'set-cookie' ||
      normalizedKey === 'transfer-encoding'
    ) {
      return;
    }

    headers.append(key, value);
  });

  headers.set('cache-control', 'no-store');
  return headers;
}

async function proxyUploadRequest(request: Request, context: RouteContext) {
  try {
    const { path } = await context.params;
    if (!path?.length) {
      return NextResponse.json({ error: 'Chemin de document manquant.' }, { status: 400 });
    }

    const requestUrl = new URL(request.url);
    const upstreamPath = path.map((segment) => encodeURIComponent(segment)).join('/');
    const targetUrl = `${BACKEND_BASE}/uploads/${upstreamPath}${requestUrl.search}`;

    const upstream = await fetch(targetUrl, {
      method: request.method.toUpperCase(),
      headers: buildForwardHeaders(request),
      cache: 'no-store',
      redirect: 'manual',
    });

    const body = request.method.toUpperCase() === 'HEAD'
      ? undefined
      : await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: upstream.status,
      headers: buildResponseHeaders(upstream),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Connexion au backend impossible.',
      },
      { status: 502 }
    );
  }
}

export async function GET(request: Request, context: RouteContext) {
  return proxyUploadRequest(request, context);
}

export async function HEAD(request: Request, context: RouteContext) {
  return proxyUploadRequest(request, context);
}