import { createHmac, randomBytes } from 'node:crypto';

export const ADMIN_SESSION_COOKIE_NAME = 'admin_session';

function getAdminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET?.trim() || 'local-dev-admin-session-secret';
}

export function createAdminSessionToken() {
  const timestamp = Date.now().toString(36);
  const nonce = randomBytes(16).toString('hex');
  const payload = `${timestamp}:${nonce}`;
  const signature = createHmac('sha256', getAdminSessionSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}