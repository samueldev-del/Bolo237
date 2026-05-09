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

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DOCUMENT_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const ALLOWED_UPLOAD_MIME = new Set([...IMAGE_MIME, ...DOCUMENT_MIME]);

// Alias rétro-compat avec la feature proxy first-party (origin/main).
const IMAGE_UPLOAD_MIME = IMAGE_MIME;

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

/**
 * Crée une instance multer avec une whitelist mime + une taille max dédiée.
 * On préfère des instances spécialisées (uploadCv, uploadImage…) à un seul
 * upload générique, pour réduire la surface d'attaque (DOS via gros fichiers
 * sur des endpoints qui ne devraient accepter que des miniatures).
 */
function createUpload({ allowedMime, maxBytes }) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
    fileFilter: (_req, file, cb) => {
      const mime = String(file.mimetype || '').toLowerCase();
      if (!allowedMime.has(mime)) {
        return cb(new Error('Format de fichier non supporte.'));
      }
      cb(null, true);
    },
  });
}

const MB = 1024 * 1024;

// CVs : PDF/DOC/DOCX/images jusqu'à 5 MB.
const uploadCv = createUpload({ allowedMime: ALLOWED_UPLOAD_MIME, maxBytes: 5 * MB });

// Images seules (profils, logos, miniatures) : jusqu'à 2 MB.
const uploadImage = createUpload({ allowedMime: IMAGE_MIME, maxBytes: 2 * MB });

// Documents de vérification (carte d'identité, justificatifs) : jusqu'à 8 MB
// pour absorber les scans haute résolution.
const uploadVerificationDoc = createUpload({ allowedMime: ALLOWED_UPLOAD_MIME, maxBytes: 8 * MB });

// Backward-compat : l'ancienne instance `upload` reste générique 5 MB.
// Migrez les nouveaux call sites vers les instances spécialisées ci-dessus.
const upload = uploadCv;

const { sniffFileType, safeExtensionForMime } = require('./fileSniff');
const { scanBuffer } = require('./antivirus');

/**
 * Wrap multer middleware pour scanner systématiquement les uploads avec ClamAV
 * quand activé. Renvoie 422 si infecté, sinon laisse passer. Si l'antivirus
 * n'est pas configuré, c'est un no-op silencieux.
 */
function withAvScan(uploadInstance, fieldName) {
  const single = uploadInstance.single(fieldName);
  return (req, res, next) => {
    single(req, res, async (err) => {
      if (err) return next(err);
      if (!req.file?.buffer) return next();
      try {
        await scanBuffer(req.file.buffer, fieldName);
        return next();
      } catch (avErr) {
        if (avErr.code === 'AV_INFECTED') {
          return res.status(422).json({
            success: false,
            message: 'Le fichier transmis a ete refuse pour cause de detection antivirus.',
          });
        }
        return next(avErr);
      }
    });
  };
}

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
  uploadCv,
  uploadImage,
  uploadVerificationDoc,
  createUpload,
  withAvScan,
  ALLOWED_UPLOAD_MIME,
  IMAGE_MIME,
  IMAGE_UPLOAD_MIME,
  DOCUMENT_MIME,
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
