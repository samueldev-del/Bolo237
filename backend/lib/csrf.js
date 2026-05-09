const crypto = require('crypto');

const CSRF_COOKIE_NAME = String(process.env.CSRF_COOKIE_NAME || 'bolo237_csrf').trim() || 'bolo237_csrf';
const CSRF_HEADER_CANDIDATES = ['x-csrf-token', 'x-xsrf-token'];
const CSRF_BODY_CANDIDATES = ['_csrf', 'csrfToken'];

function isSafeMethod(method) {
  const normalized = String(method || '').toUpperCase();
  return normalized === 'GET' || normalized === 'HEAD' || normalized === 'OPTIONS';
}

function normalizeToken(value) {
  const token = String(value || '').trim();
  if (!token) return '';
  if (!/^[a-fA-F0-9]{64}$/.test(token)) return '';
  return token.toLowerCase();
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function buildCsrfCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  const configuredSameSite = String(process.env.CSRF_COOKIE_SAMESITE || process.env.SESSION_COOKIE_SAMESITE || '')
    .trim()
    .toLowerCase();
  const sameSite = configuredSameSite === 'strict' || configuredSameSite === 'lax' || configuredSameSite === 'none'
    ? configuredSameSite
    : (isProd ? 'none' : 'lax');
  const secure = sameSite === 'none' || isProd || String(process.env.CSRF_COOKIE_SECURE || '').trim().toLowerCase() === 'true';

  // httpOnly:true protège contre la lecture du cookie en cas de XSS.
  // Les clients récupèrent le token via GET /api/csrf-token (body JSON ou
  // header X-CSRF-Token), pattern double-submit toujours valable.
  const options = {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
  };

  const configuredDomain = String(process.env.CSRF_COOKIE_DOMAIN || '').trim();
  if (configuredDomain) {
    options.domain = configuredDomain;
  }

  return options;
}

function getRequestToken(req) {
  for (const headerName of CSRF_HEADER_CANDIDATES) {
    const value = req.get(headerName);
    const normalized = normalizeToken(value);
    if (normalized) return normalized;
  }

  const body = req.body && typeof req.body === 'object' ? req.body : null;
  if (body) {
    for (const fieldName of CSRF_BODY_CANDIDATES) {
      const normalized = normalizeToken(body[fieldName]);
      if (normalized) return normalized;
    }
  }

  return '';
}

function ensureCsrfCookie(req, res, next) {
  let token = normalizeToken(req.cookies?.[CSRF_COOKIE_NAME]);

  if (!token) {
    token = generateToken();
    res.cookie(CSRF_COOKIE_NAME, token, buildCsrfCookieOptions());
  }

  req.csrfToken = token;
  res.setHeader('X-CSRF-Token', token);
  return next();
}

function verifyCsrfToken(req, res, next) {
  if (isSafeMethod(req.method)) {
    return next();
  }

  const cookieToken = normalizeToken(req.cookies?.[CSRF_COOKIE_NAME]);
  const requestToken = getRequestToken(req);

  if (!cookieToken || !requestToken) {
    return res.status(403).json({ error: 'Jeton CSRF requis.' });
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const requestBuffer = Buffer.from(requestToken);

  if (cookieBuffer.length !== requestBuffer.length || !crypto.timingSafeEqual(cookieBuffer, requestBuffer)) {
    return res.status(403).json({ error: 'Jeton CSRF invalide.' });
  }

  return next();
}

function csrfTokenRoute(req, res) {
  // Force la création/lecture du token au cas où le middleware aurait été
  // contourné (mounting custom). Garantit qu'un body non vide est toujours retourné.
  let token = normalizeToken(req.csrfToken);
  if (!token) {
    token = normalizeToken(req.cookies?.[CSRF_COOKIE_NAME]);
  }
  if (!token) {
    token = generateToken();
    res.cookie(CSRF_COOKIE_NAME, token, buildCsrfCookieOptions());
    res.setHeader('X-CSRF-Token', token);
  }
  res.status(200).json({ csrfToken: token });
}

module.exports = {
  CSRF_COOKIE_NAME,
  ensureCsrfCookie,
  verifyCsrfToken,
  csrfTokenRoute,
};
