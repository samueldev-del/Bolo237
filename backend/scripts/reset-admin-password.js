require('dotenv').config();
const bcrypt = require('bcryptjs');
const { prisma, pool } = require('../lib/db');

async function main() {
  const adminEmail = String(process.env.ADMIN_TARGET_EMAIL || 'admin@bolo237.com')
    .trim()
    .toLowerCase();
  const plainPassword = String(process.env.ADMIN_BACKEND_PASSWORD || '').trim();
  const rounds = Number.parseInt(String(process.env.BCRYPT_SALT_ROUNDS || '12'), 10);

  if (!adminEmail) {
    throw new Error('ADMIN_TARGET_EMAIL is required.');
  }

  if (!plainPassword) {
    throw new Error('ADMIN_BACKEND_PASSWORD is required and must contain the new plain password.');
  }

  if (!Number.isFinite(rounds) || rounds < 10 || rounds > 15) {
    throw new Error('BCRYPT_SALT_ROUNDS must be an integer between 10 and 15.');
  }

  const user = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, email: true, role: true, isBanned: true },
  });

  if (!user) {
    throw new Error(`Admin user not found for email: ${adminEmail}`);
  }

  const passwordHash = await bcrypt.hash(plainPassword, rounds);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: passwordHash },
  });

  console.log('Password updated successfully.');
  console.log(`User: ${user.email} (id=${user.id}, role=${user.role})`);
}

main()
  .catch((error) => {
    console.error('[reset-admin-password] failed:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
