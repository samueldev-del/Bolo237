import { NextResponse } from 'next/server';

const BACKEND_BASE = String(
  process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
).replace(/\/+$/, '');
const SESSION_COOKIE_NAME = 'bolo237_session';

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
  headers.delete('origin');
  return headers;
}

async function readRequestBody(request: Request): Promise<BodyInit | undefined> {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD') return undefined;

  const body = await request.arrayBuffer();
  return body.byteLength > 0 ? body : undefined;
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

function getSetCookieHeaders(headers: Headers): string[] {
  const setCookieHeaders = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() || [];
  if (setCookieHeaders.length > 0) return setCookieHeaders;

  const setCookie = headers.get('set-cookie');
  return setCookie ? [setCookie] : [];
}

function parseSetCookie(cookieHeader: string) {
  const parts = String(cookieHeader || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

  const [nameValue = '', ...attributes] = parts;
  const separatorIndex = nameValue.indexOf('=');
  if (separatorIndex <= 0) return null;

  const name = nameValue.slice(0, separatorIndex).trim();
  const value = nameValue.slice(separatorIndex + 1);
  const options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    path?: string;
    maxAge?: number;
    expires?: Date;
  } = {};

  for (const attribute of attributes) {
    const [rawKey, ...rawValueParts] = attribute.split('=');
    const key = rawKey.trim().toLowerCase();
    const rawValue = rawValueParts.join('=').trim();

    if (key === 'httponly') {
      options.httpOnly = true;
      continue;
    }
    if (key === 'secure') {
      options.secure = true;
      continue;
    }
    if (key === 'path' && rawValue) {
      options.path = rawValue;
      continue;
    }
    if (key === 'max-age' && rawValue) {
      const maxAge = Number(rawValue);
      if (Number.isFinite(maxAge)) options.maxAge = maxAge;
      continue;
    }
    if (key === 'expires' && rawValue) {
      const expires = new Date(rawValue);
      if (!Number.isNaN(expires.getTime())) options.expires = expires;
      continue;
    }
    if (key === 'samesite' && rawValue) {
      const sameSite = rawValue.toLowerCase();
      if (sameSite === 'lax' || sameSite === 'strict' || sameSite === 'none') {
        options.sameSite = sameSite;
      }
    }
  }

  return { name, value, options };
}

function applyUpstreamCookies(response: NextResponse, upstream: Response) {
  for (const cookieHeader of getSetCookieHeaders(upstream.headers)) {
    const parsed = parseSetCookie(cookieHeader);
    if (!parsed || parsed.name !== SESSION_COOKIE_NAME) {
      continue;
    }

    const cookieOptions = {
      path: parsed.options.path || '/',
      httpOnly: parsed.options.httpOnly ?? true,
      secure: parsed.options.secure ?? process.env.NODE_ENV === 'production',
      sameSite: parsed.options.sameSite || 'lax',
      maxAge: parsed.options.maxAge,
      expires: parsed.options.expires,
    } as const;

    if (!parsed.value || parsed.options.maxAge === 0) {
      response.cookies.set(SESSION_COOKIE_NAME, '', {
        ...cookieOptions,
        maxAge: 0,
        expires: new Date(0),
      });
      continue;
    }

    response.cookies.set(SESSION_COOKIE_NAME, parsed.value, cookieOptions);
  }
}

async function proxyRequest(request: Request, context: RouteContext) {
  try {
    const { path } = await context.params;
    if (!path?.length) {
      return NextResponse.json({ error: 'Chemin backend manquant.' }, { status: 400 });
    }

    const requestUrl = new URL(request.url);
    const targetUrl = `${BACKEND_BASE}/api/${path.join('/')}${requestUrl.search}`;

    const upstream = await fetch(targetUrl, {
      method: request.method.toUpperCase(),
      headers: buildForwardHeaders(request),
      body: await readRequestBody(request),
      cache: 'no-store',
      redirect: 'manual',
    });

    const body = await upstream.arrayBuffer();

    const response = new NextResponse(body, {
      status: upstream.status,
      headers: buildResponseHeaders(upstream),
    });

    applyUpstreamCookies(response, upstream);

    return response;
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
  return proxyRequest(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function HEAD(request: Request, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function OPTIONS(request: Request, context: RouteContext) {
  return proxyRequest(request, context);
}