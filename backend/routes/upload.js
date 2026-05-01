const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { reportError } = require('../lib/observability');
const {
  cloudinary,
  upload,
  ALLOWED_UPLOAD_MIME,
  uploadsRoot,
  sniffFileType,
  safeExtensionForMime,
} = require('../lib/uploads');
const { uploadIpLimiter } = require('../lib/limiters');

const router = express.Router();

router.post('/', uploadIpLimiter, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    if (!ALLOWED_UPLOAD_MIME.has(String(req.file.mimetype || '').toLowerCase())) {
      return res.status(400).json({ error: 'Type de fichier non autorise. Formats acceptes: jpeg, png, webp.' });
    }

    const detectedMime = await sniffFileType(req.file.buffer, req.file.mimetype);
    if (!detectedMime || !ALLOWED_UPLOAD_MIME.has(detectedMime)) {
      return res.status(415).json({ error: 'Type de fichier reel invalide.' });
    }

    const safeFolder = String(req.query.folder || 'general')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 32) || 'general';

    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      const folder = `bolo237/${safeFolder}`;

      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder, resource_type: 'image' },
          (error, uploadResult) => (error ? reject(error) : resolve(uploadResult)),
        );
        stream.end(req.file.buffer);
      });

      return res.json({ url: result.secure_url, publicId: result.public_id });
    }

    const extension = safeExtensionForMime(detectedMime);
    const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;
    const targetDir = path.join(uploadsRoot, safeFolder);
    if (!targetDir.startsWith(uploadsRoot + path.sep) && targetDir !== uploadsRoot) {
      return res.status(400).json({ error: 'Folder invalide.' });
    }
    fs.mkdirSync(targetDir, { recursive: true });

    const fullPath = path.join(targetDir, fileName);
    fs.writeFileSync(fullPath, req.file.buffer);

    const relativePath = `${safeFolder}/${fileName}`.replace(/\\/g, '/');
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    res.json({ url: `${baseUrl}/uploads/${relativePath}`, publicId: relativePath });
  } catch (error) {
    reportError('Upload error', error, {
      route: '/api/upload',
      folder: req.query?.folder,
    });
    if (error?.message === 'Invalid file type') {
      return res.status(400).json({ error: 'Type de fichier non autorise. Formats acceptes: jpeg, png, webp.' });
    }
    if (error?.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Fichier trop volumineux. Taille maximale: 5 Mo.' });
    }
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
