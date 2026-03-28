const http = require('http');
const https = require('https');

const base = process.env.BASE_URL || 'http://localhost:5060';
const root = new URL(base);
const transport = root.protocol === 'https:' ? https : http;
const expectSameSite = String(process.env.EXPECT_SAMESITE || (root.protocol === 'https:' ? 'none' : '')).trim().toLowerCase();
const requireSecureCookie = String(process.env.REQUIRE_SECURE_COOKIE || (root.protocol === 'https:' ? 'true' : 'false')).trim().toLowerCase() === 'true';
const stamp = Date.now();
const email = `sess.qa.${stamp}@bolo237.test`;
const phone = `+2376${String(stamp).slice(-8)}`;
const password = 'Pass1234!';

function parseCookieAttributes(setCookieHeader) {
  const parts = String(setCookieHeader || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { nameValue: '', sameSite: '', secure: false, httpOnly: false };
  }

  let sameSite = '';
  let secure = false;
  let httpOnly = false;

  for (let index = 1; index < parts.length; index += 1) {
    const item = parts[index];
    const lowered = item.toLowerCase();
    if (lowered === 'secure') secure = true;
    if (lowered === 'httponly') httpOnly = true;
    if (lowered.startsWith('samesite=')) sameSite = lowered.replace('samesite=', '').trim();
  }

  return {
    nameValue: parts[0],
    sameSite,
    secure,
    httpOnly,
  };
}

function req(path, options = {}, cookie) {
  return new Promise((resolve, reject) => {
    const payload = typeof options.body === 'string' ? options.body : '';
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (cookie) {
      headers.Cookie = cookie;
    }

    const request = transport.request(
      {
        protocol: root.protocol,
        hostname: root.hostname,
        port: root.port || (root.protocol === 'https:' ? 443 : 80),
        path,
        method: options.method || 'GET',
        headers,
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let body;
          try {
            body = raw ? JSON.parse(raw) : {};
          } catch {
            body = { raw };
          }

          const setCookieHeader = res.headers['set-cookie'];
          const setCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : String(setCookieHeader || '');

          resolve({
            status: Number(res.statusCode || 0),
            body,
            setCookie,
          });
        });
      }
    );

    request.on('error', reject);
    if (payload) request.write(payload);
    request.end();
  });
}

(async () => {
  let createdId = 0;
  try {
    const created = await req('/api/users', {
      method: 'POST',
      body: JSON.stringify({ email, phone, password, name: 'Session QA', role: 'CANDIDAT' }),
    });
    if (created.status !== 201) throw new Error('create failed ' + JSON.stringify(created.body));
    createdId = created.body.id;

    const login = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: phone, password }),
    });
    if (login.status !== 200) throw new Error('login failed ' + JSON.stringify(login.body));
    const cookieMeta = parseCookieAttributes(login.setCookie);
    const cookie = cookieMeta.nameValue;
    if (!cookie) throw new Error('missing session cookie');

    if (!cookieMeta.httpOnly) {
      throw new Error('session cookie must include HttpOnly');
    }
    if (requireSecureCookie && !cookieMeta.secure) {
      throw new Error('session cookie must include Secure');
    }
    if (expectSameSite && cookieMeta.sameSite !== expectSameSite) {
      throw new Error(`session cookie SameSite=${cookieMeta.sameSite || 'missing'}, expected ${expectSameSite}`);
    }

    const me = await req('/api/auth/me', {}, cookie);
    if (me.status !== 200) throw new Error('auth/me failed ' + JSON.stringify(me.body));

    const logout = await req('/api/auth/logout', { method: 'POST' }, cookie);
    if (logout.status !== 200) throw new Error('logout failed ' + JSON.stringify(logout.body));

    const meAfter = await req('/api/auth/me', {}, cookie);
    if (meAfter.status !== 401) throw new Error('auth/me after logout should be 401, got ' + meAfter.status);

    await req(`/api/users/${createdId}`, { method: 'DELETE' });
    console.log('SESSION_COOKIE_FLOW_OK', JSON.stringify({
      base,
      secure: cookieMeta.secure,
      sameSite: cookieMeta.sameSite || 'missing',
      httpOnly: cookieMeta.httpOnly,
    }));
  } catch (error) {
    if (createdId) {
      await req(`/api/users/${createdId}`, { method: 'DELETE' });
    }
    console.error('SESSION_COOKIE_FLOW_FAIL', error.message || error);
    process.exit(1);
  }
})();
