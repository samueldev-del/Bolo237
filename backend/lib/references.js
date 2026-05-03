const crypto = require('crypto');

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans I/O/0/1 pour éviter confusions

function generateJobReference() {
  const bytes = crypto.randomBytes(5);
  let ref = 'BOLO-';
  for (let i = 0; i < 5; i++) {
    ref += CHARS[bytes[i] % CHARS.length];
  }
  return ref;
}

module.exports = { generateJobReference };
