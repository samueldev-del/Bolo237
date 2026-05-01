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

const uploadsRoot = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_UPLOAD_MIME.has(String(file.mimetype || '').toLowerCase())) {
      return cb(new Error('Format de fichier non supporte. Veuillez envoyer un PDF, DOC, DOCX, JPG ou PNG.'));
    }
    cb(null, true);
  },
});

module.exports = { cloudinary, upload, ALLOWED_UPLOAD_MIME, uploadsRoot };
