const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { prisma } = require('./db');

const SESSION_COOKIE_NAME = 'bolo237_session';
const SESSION_JWT_SECRET = process.env.SESSION_JWT_SECRET || 'change-me-in-production';

function getSessionCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  const configuredSameSite = String(process.env.SESSION_COOKIE_SAMESITE || '').trim().toLowerCase();
  const sameSite = configuredSameSite === 'strict' || configuredSameSite === 'lax' || configuredSameSite === 'none'
    ? configuredSameSite
    : (isProd ? 'none' : 'lax');

  const forceSecure = String(process.env.SESSION_COOKIE_SECURE || '').trim().toLowerCase() === 'true';
  const secure = forceSecure || isProd || sameSite === 'none';

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function getSessionCookieClearOptions() {
  const { maxAge: _maxAge, ...cookieOptions } = getSessionCookieOptions();
  return cookieOptions;
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, getSessionCookieClearOptions());
}

function createSessionToken(user) {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, jti },
    SESSION_JWT_SECRET,
    { expiresIn: '7d' },
  );

  return token;
}

async function readSessionToken(req) {
  const raw = req.cookies?.[SESSION_COOKIE_NAME];
  if (!raw) return null;

  let payload;
  try {
    payload = jwt.verify(raw, SESSION_JWT_SECRET);
  } catch {
    return null;
  }

  if (payload?.jti) {
    try {
      const revoked = await prisma.revokedSession.findUnique({
        where: { jti: String(payload.jti) },
      });
      if (revoked && revoked.expiresAt > new Date()) {
        return null;
      }
    } catch (error) {
      console.error('readSessionToken revocation check error:', error);
    }
  }

  return payload;
}

async function requireAdminSession(req, res, next) {
  try {
    const payload = await readSessionToken(req);
    if (!payload?.userId) {
      return res.status(401).json({ error: 'Session admin requise.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.userId) },
      select: { id: true, role: true, isBanned: true },
    });

    if (!user || user.isBanned) {
      return res.status(403).json({ error: 'Acces refuse.' });
    }

    const role = String(user.role || '').toUpperCase();
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Acces admin requis.' });
    }

    req.adminUserId = user.id;
    return next();
  } catch (error) {
    console.error('requireAdminSession error:', error);
    return res.status(500).json({ error: 'Erreur de verification admin.' });
  }
}

async function requireUserSession(req, res, next) {
  try {
    const payload = await readSessionToken(req);
    if (!payload?.userId) {
      return res.status(401).json({ error: 'Session requise.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.userId) },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        photoUrl: true,
        isVerified: true,
        isBanned: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Session invalide.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Compte banni.' });
    }

    req.sessionUser = user;
    return next();
  } catch (error) {
    console.error('requireUserSession error:', error);
    return res.status(500).json({ error: 'Erreur de verification utilisateur.' });
  }
}

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_JWT_SECRET,
  getSessionCookieOptions,
  getSessionCookieClearOptions,
  clearSessionCookie,
  createSessionToken,
  readSessionToken,
  requireAdminSession,
  requireUserSession,
};
