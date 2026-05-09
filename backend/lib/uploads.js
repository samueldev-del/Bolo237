const crypto = require('crypto');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  console.log('✅ Cloudinary configured');
} else {
  console.warn('⚠️ Cloudinary not configured — file uploads will fail');
}

const ALLOWED_UPLOAD_MIME = new Set([
  // Images (Profils, Logos)
  'image/jpeg',
  'image/png',
  'image/webp',

  // Documents (CVs)
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const IMAGE_UPLOAD_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const PUBLIC_UPLOAD_FOLDERS = new Set([
  'avatars',
  'company-logos',
  'artisan-photos',
  'artisan-portfolio',
]);

const PRIVATE_UPLOAD_FOLDERS = new Set([
  'cv',
  'candidate-documents',
]);

const ALL_UPLOAD_FOLDERS = new Set([
  ...PUBLIC_UPLOAD_FOLDERS,
  ...PRIVATE_UPLOAD_FOLDERS,
]);

const REMOTE_UPLOAD_PREFIX = '__remote__';

const uploadsRoot = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_UPLOAD_MIME.has(String(file.mimetype || '').toLowerCase())) {
      return cb(new Error('Format de fichier non supporte. Veuillez envoyer un PDF, DOC, DOCX, JPG ou PNG.'));
    }
    cb(null, true);
  },
});

const { sniffFileType, safeExtensionForMime } = require('./fileSniff');

function normalizeUploadFolder(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32);

  return ALL_UPLOAD_FOLDERS.has(normalized) ? normalized : null;
}

function isPrivateUploadFolder(folder) {
  return PRIVATE_UPLOAD_FOLDERS.has(String(folder || '').trim().toLowerCase());
}

function isPublicUploadFolder(folder) {
  return PUBLIC_UPLOAD_FOLDERS.has(String(folder || '').trim().toLowerCase());
}

function isUploadMimeAllowedForFolder(folder, mimeType) {
  const normalizedFolder = normalizeUploadFolder(folder);
  const normalizedMime = String(mimeType || '').trim().toLowerCase();

  if (!normalizedFolder || !normalizedMime) {
    return false;
  }

  if (isPublicUploadFolder(normalizedFolder)) {
    return IMAGE_UPLOAD_MIME.has(normalizedMime);
  }

  return ALLOWED_UPLOAD_MIME.has(normalizedMime);
}

function buildUploadUrl(req, folder, fileName) {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/${folder}/${fileName}`;
}

function buildPrivateFileName(ownerId, extension) {
  const normalizedOwnerId = Number(ownerId);
  const safeOwnerId = Number.isFinite(normalizedOwnerId) && normalizedOwnerId > 0 ? normalizedOwnerId : 0;
  return `u${safeOwnerId}__${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;
}

function encodeRemoteUploadToken(value) {
  return Buffer.from(String(value || ''), 'utf8').toString('base64url');
}

function decodeRemoteUploadToken(value) {
  try {
    return Buffer.from(String(value || ''), 'base64url').toString('utf8');
  } catch {
    return '';
  }
}

function buildPrivateRemoteUploadUrl(req, folder, ownerId, remoteUrl) {
  const ownerPrefix = `u${Number(ownerId) || 0}__`;
  const fileName = `${ownerPrefix}${REMOTE_UPLOAD_PREFIX}${encodeRemoteUploadToken(remoteUrl)}`;
  return buildUploadUrl(req, folder, fileName);
}

function extractPrivateUploadOwnerId(fileName) {
  const match = String(fileName || '').match(/^u(\d+)__/i);
  if (!match) {
    return null;
  }

  const ownerId = Number.parseInt(match[1], 10);
  return Number.isFinite(ownerId) && ownerId > 0 ? ownerId : null;
}

function extractRemoteUploadUrl(fileName) {
  const normalized = String(fileName || '');
  const markerIndex = normalized.indexOf(REMOTE_UPLOAD_PREFIX);
  if (markerIndex < 0) {
    return '';
  }

  return decodeRemoteUploadToken(normalized.slice(markerIndex + REMOTE_UPLOAD_PREFIX.length));
}

module.exports = {
  cloudinary,
  upload,
  ALLOWED_UPLOAD_MIME,
  PUBLIC_UPLOAD_FOLDERS,
  PRIVATE_UPLOAD_FOLDERS,
  REMOTE_UPLOAD_PREFIX,
  uploadsRoot,
  sniffFileType,
  safeExtensionForMime,
  normalizeUploadFolder,
  isPrivateUploadFolder,
  isPublicUploadFolder,
  isUploadMimeAllowedForFolder,
  buildUploadUrl,
  buildPrivateFileName,
  buildPrivateRemoteUploadUrl,
  extractPrivateUploadOwnerId,
  extractRemoteUploadUrl,
};
