const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { prisma } = require('./db');

const SESSION_COOKIE_NAME = 'bolo237_session';

if (!process.env.SESSION_JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_JWT_SECRET environment variable is required in production');
  }
  console.warn('⚠️  SESSION_JWT_SECRET not set — using insecure development fallback');
}
if (process.env.SESSION_JWT_SECRET && process.env.SESSION_JWT_SECRET.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_JWT_SECRET must be at least 32 characters in production');
  }
  console.warn('⚠️  SESSION_JWT_SECRET should be at least 32 chars');
}
const SESSION_JWT_SECRET = process.env.SESSION_JWT_SECRET || 'dev-only-insecure-fallback-do-not-use-in-prod';

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

/**
 * Révoque le JWT actuellement présent sur la requête (s'il y en a un).
 * À appeler AVANT d'émettre un nouveau token au login pour éviter qu'un
 * token volé/anciennement copié reste valide en parallèle du nouveau.
 */
async function revokeCurrentSessionToken(req) {
  const raw = req?.cookies?.[SESSION_COOKIE_NAME];
  if (!raw) return;

  let decoded;
  try {
    decoded = jwt.verify(raw, SESSION_JWT_SECRET);
  } catch {
    // Token invalide ou expiré : rien à révoquer.
    return;
  }
  if (!decoded?.jti) return;

  const expMs = decoded?.exp ? Number(decoded.exp) * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(expMs);

  try {
    await prisma.revokedSession.upsert({
      where: { jti: String(decoded.jti) },
      update: { expiresAt },
      create: { jti: String(decoded.jti), expiresAt },
    });
  } catch (error) {
    console.error('revokeCurrentSessionToken error:', error);
  }
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

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);
const MODERATOR_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'MODERATOR']);

function buildRoleGuard(allowedRoles, errorLabel) {
  return async function roleGuard(req, res, next) {
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
      if (!allowedRoles.has(role)) {
        return res.status(403).json({ error: errorLabel });
      }

      req.adminUserId = user.id;
      req.adminRole = role;
      return next();
    } catch (error) {
      console.error('requireAdminSession error:', error);
      return res.status(500).json({ error: 'Erreur de verification admin.' });
    }
  };
}

const requireAdminSession = buildRoleGuard(ADMIN_ROLES, 'Acces admin requis.');
const requireModeratorSession = buildRoleGuard(MODERATOR_ROLES, 'Acces moderation requis.');

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
  revokeCurrentSessionToken,
  readSessionToken,
  requireAdminSession,
  requireModeratorSession,
  requireUserSession,
};
