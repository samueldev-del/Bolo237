// Magic-byte sniffing for the limited set of MIME types we accept.
// Avoids adding the heavy `file-type` ESM dependency.

function startsWith(buffer, bytes, offset = 0) {
  if (!buffer || buffer.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i += 1) {
    if (buffer[offset + i] !== bytes[i]) return false;
  }
  return true;
}

function detectMime(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return null;

  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp';
  }
  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf';
  // legacy DOC (OLE compound)
  if (startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'application/msword';
  // DOCX = ZIP container — also matches XLSX/PPTX, so caller must cross-check declared mime
  if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]) || startsWith(buffer, [0x50, 0x4b, 0x05, 0x06])) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  return null;
}

const EXTENSION_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

// Sniff the buffer and require it match the client-declared MIME (when sniffable).
// Returns the trusted MIME on success, null on mismatch.
async function sniffFileType(buffer, declaredMime) {
  const detected = detectMime(buffer);
  if (!detected) return null;
  const declared = String(declaredMime || '').toLowerCase();
  // ZIP-based DOCX: trust declared mime if it is a known ZIP-based office type
  if (detected === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    if (declared === detected) return detected;
    return null;
  }
  if (declared && declared !== detected) return null;
  return detected;
}

function safeExtensionForMime(mime) {
  return EXTENSION_BY_MIME[String(mime || '').toLowerCase()] || '';
}

module.exports = { sniffFileType, safeExtensionForMime, detectMime };
