const http = require('http');
const https = require('https');

const base = process.env.BASE_URL || 'http://localhost:5060';
const root = new URL(base);
const transport = root.protocol === 'https:' ? https : http;
const stamp = Date.now();
const email = `sess.qa.${stamp}@bolo237.test`;
const password = 'Pass1234!';

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
      body: JSON.stringify({ email, password, name: 'Session QA', role: 'CANDIDAT' }),
    });
    if (created.status !== 201) throw new Error('create failed ' + JSON.stringify(created.body));
    createdId = created.body.id;

    const login = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (login.status !== 200) throw new Error('login failed ' + JSON.stringify(login.body));
    const cookie = (login.setCookie || '').split(';')[0];
    if (!cookie) throw new Error('missing session cookie');

    const me = await req('/api/auth/me', {}, cookie);
    if (me.status !== 200) throw new Error('auth/me failed ' + JSON.stringify(me.body));

    const logout = await req('/api/auth/logout', { method: 'POST' }, cookie);
    if (logout.status !== 200) throw new Error('logout failed ' + JSON.stringify(logout.body));

    const meAfter = await req('/api/auth/me', {}, cookie);
    if (meAfter.status !== 401) throw new Error('auth/me after logout should be 401, got ' + meAfter.status);

    await req(`/api/users/${createdId}`, { method: 'DELETE' });
    console.log('SESSION_COOKIE_FLOW_OK');
  } catch (error) {
    if (createdId) {
      await req(`/api/users/${createdId}`, { method: 'DELETE' });
    }
    console.error('SESSION_COOKIE_FLOW_FAIL', error.message || error);
    process.exit(1);
  }
})();
