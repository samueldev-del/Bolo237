const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local'), override: true });
const bcrypt = require('bcryptjs');
const { prisma, pool } = require('../lib/db');

function normalizeRole(value) {
  const role = String(value || 'ADMIN').trim().toUpperCase();
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return role;
  throw new Error('ADMIN_TARGET_ROLE must be ADMIN or SUPER_ADMIN.');
}

async function main() {
  const adminEmail = String(process.env.ADMIN_TARGET_EMAIL || process.env.ADMIN_BACKEND_EMAIL || '')
    .trim()
    .toLowerCase();
  const plainPassword = String(process.env.ADMIN_BACKEND_PASSWORD || '').trim();
  const adminName = String(process.env.ADMIN_TARGET_NAME || 'Bolo237 Admin').trim();
  const role = normalizeRole(process.env.ADMIN_TARGET_ROLE);
  const rounds = Number.parseInt(String(process.env.BCRYPT_SALT_ROUNDS || '12'), 10);

  if (!adminEmail) {
    throw new Error('ADMIN_TARGET_EMAIL or ADMIN_BACKEND_EMAIL is required.');
  }

  if (!plainPassword) {
    throw new Error('ADMIN_BACKEND_PASSWORD is required.');
  }

  if (!Number.isFinite(rounds) || rounds < 10 || rounds > 15) {
    throw new Error('BCRYPT_SALT_ROUNDS must be an integer between 10 and 15.');
  }

  const passwordHash = await bcrypt.hash(plainPassword, rounds);

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, email: true, role: true },
  });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        password: passwordHash,
        role,
        name: adminName || existing.email,
        isVerified: true,
        isBanned: false,
        bannedAt: null,
        banReason: null,
      },
      select: { id: true, email: true, role: true },
    });

    console.log('[ensure-admin-user] updated existing admin user');
    console.log(JSON.stringify(updated, null, 2));
    return;
  }

  const created = await prisma.user.create({
    data: {
      email: adminEmail,
      password: passwordHash,
      name: adminName || adminEmail,
      role,
      isVerified: true,
      isBanned: false,
    },
    select: { id: true, email: true, role: true },
  });

  console.log('[ensure-admin-user] created admin user');
  console.log(JSON.stringify(created, null, 2));
}

main()
  .catch((error) => {
    console.error('[ensure-admin-user] failed:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
