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
  DOCUMENT_MIME,
  uploadsRoot,
  sniffFileType,
  safeExtensionForMime,
};
