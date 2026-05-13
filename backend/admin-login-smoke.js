const DEFAULT_BASE = 'http://localhost:3000';
const DEFAULT_PROTECTED_PATH = '/api/backend/admin/users?page=1&limit=1';
const ADMIN_SESSION_COOKIE_NAME = 'admin_session';
const BACKEND_SESSION_COOKIE_NAME = 'admin_backend_session';

function getSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie().filter(Boolean);
  }

  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

function updateCookieJar(cookieJar, setCookies) {
  for (const rawCookie of setCookies) {
    const cookiePair = String(rawCookie || '').split(';')[0].trim();
    if (!cookiePair || !cookiePair.includes('=')) {
      continue;
    }

    const separatorIndex = cookiePair.indexOf('=');
    const cookieName = cookiePair.slice(0, separatorIndex).trim();
    const cookieValue = cookiePair.slice(separatorIndex + 1);
    const normalized = String(rawCookie || '').toLowerCase();
    const shouldDelete = cookieValue.length === 0 || normalized.includes('max-age=0');

    if (shouldDelete) {
      cookieJar.delete(cookieName);
      continue;
    }

    cookieJar.set(cookieName, `${cookieName}=${cookieValue}`);
  }
}

function buildCookieHeader(cookieJar) {
  return Array.from(cookieJar.values()).join('; ');
}

async function readBody(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function request(baseUrl, path, options, cookieJar) {
  const headers = new Headers(options.headers || {});
  const cookieHeader = buildCookieHeader(cookieJar);
  if (cookieHeader) {
    headers.set('cookie', cookieHeader);
  }

  const response = await fetch(new URL(path, baseUrl), {
    method: options.method || 'GET',
    headers,
    body: options.body,
    redirect: 'manual',
  });

  const setCookies = getSetCookies(response.headers);
  updateCookieJar(cookieJar, setCookies);

  return {
    status: response.status,
    body: await readBody(response),
    setCookies,
  };
}

async function main() {
  const base = String(process.env.ADMIN_BASE_URL || process.env.BASE_URL || DEFAULT_BASE).trim();
  const identifier = String(
    process.env.ADMIN_SMOKE_USERNAME ||
    process.env.ADMIN_BACKEND_EMAIL ||
    process.env.ADMIN_LOGIN_USERNAME ||
    ''
  ).trim();
  const password = String(
    process.env.ADMIN_SMOKE_PASSWORD ||
    process.env.ADMIN_BACKEND_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    ''
  ).trim();
  const protectedPath = String(process.env.ADMIN_SMOKE_PROTECTED_PATH || DEFAULT_PROTECTED_PATH).trim();

  if (!identifier) {
    throw new Error('ADMIN_SMOKE_USERNAME or ADMIN_BACKEND_EMAIL is required');
  }

  if (!password) {
    throw new Error('ADMIN_SMOKE_PASSWORD or ADMIN_BACKEND_PASSWORD is required');
  }

  const cookieJar = new Map();

  const loginResponse = await request(
    base,
    '/api/admin-login',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ username: identifier, password }),
    },
    cookieJar,
  );

  if (loginResponse.status !== 200 || loginResponse.body?.success !== true) {
    throw new Error(`admin login failed (${loginResponse.status}) ${JSON.stringify(loginResponse.body)}`);
  }

  if (!cookieJar.has(ADMIN_SESSION_COOKIE_NAME)) {
    throw new Error('admin_session cookie missing after admin login');
  }

  const protectedResponse = await request(base, protectedPath, { method: 'GET' }, cookieJar);
  if (protectedResponse.status !== 200) {
    throw new Error(`protected admin route failed (${protectedResponse.status}) ${JSON.stringify(protectedResponse.body)}`);
  }

  const backendSessionCookiePresent = cookieJar.has(BACKEND_SESSION_COOKIE_NAME);

  const logoutResponse = await request(base, '/api/logout', { method: 'POST' }, cookieJar);
  if (logoutResponse.status !== 200 || logoutResponse.body?.ok !== true) {
    throw new Error(`admin logout failed (${logoutResponse.status}) ${JSON.stringify(logoutResponse.body)}`);
  }

  const afterLogoutResponse = await request(base, protectedPath, { method: 'GET' }, cookieJar);
  if (afterLogoutResponse.status !== 401) {
    throw new Error(
      `protected admin route after logout should be 401, got ${afterLogoutResponse.status} ${JSON.stringify(afterLogoutResponse.body)}`
    );
  }

  console.log('ADMIN_LOGIN_SMOKE_OK', JSON.stringify({
    base,
    identifier,
    protectedPath,
    backendSessionCookiePresent,
    loginWarning: loginResponse.body?.warning || null,
  }));
}

main().catch((error) => {
  console.error('ADMIN_LOGIN_SMOKE_FAIL', error.message || error);
  process.exit(1);
});