'use strict';

/**
 * Garde-fous anti-SSRF pour toutes les URLs fournies par les utilisateurs et
 * potentiellement consommées (fetch, image-loader, prévisualisation, etc.).
 *
 * Bloque :
 *   - protocoles non-HTTPS (file:, gopher:, ftp:, javascript:, data:);
 *   - hôtes privés / réservés (RFC1918, link-local, loopback, IPv6 ULA…);
 *   - hostnames suspects (vide, métacaractères).
 *
 * Pour de l'image-loading public, on accepte aussi http: si l'env le permet
 * via TRUST_PLAINTEXT_HTTP=true (utile en dev), sinon HTTPS uniquement.
 */

const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^.*\.localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^::$/,
  /^fc00:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
  /^metadata\.google\.internal$/i,
  /^instance-data$/i,
];

function isPrivateHostname(hostname) {
  if (!hostname) return true;
  return PRIVATE_HOSTNAME_PATTERNS.some((re) => re.test(hostname));
}

function assertPublicHttpsUrl(input, { allowHttp = false } = {}) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error('URL manquante.');
  }

  let parsed;
  try {
    parsed = new URL(input.trim());
  } catch {
    throw new Error('URL invalide.');
  }

  const protocol = parsed.protocol.toLowerCase();
  const allowedProtocols = allowHttp ? ['https:', 'http:'] : ['https:'];
  if (!allowedProtocols.includes(protocol)) {
    throw new Error('Protocole non autorise.');
  }

  if (isPrivateHostname(parsed.hostname)) {
    throw new Error('Hote prive ou reserve non autorise.');
  }

  if (parsed.username || parsed.password) {
    throw new Error('Identifiants dans URL non autorises.');
  }

  return parsed.toString();
}

function isPublicHttpsUrl(input, opts) {
  try {
    assertPublicHttpsUrl(input, opts);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  assertPublicHttpsUrl,
  isPublicHttpsUrl,
  isPrivateHostname,
};
