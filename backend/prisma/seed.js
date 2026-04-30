const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Cleaning local database...');
  await prisma.contactClickEvent.deleteMany();
  await prisma.job.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.user.deleteMany();

  console.log('Starting seed...');
  const defaultPassword = await bcrypt.hash('Test1234!', 10);

  const companyName = faker.company.name();
  const entreprise = await prisma.user.create({
    data: {
      email: 'test-entreprise@bolo237.com',
      phone: '+237600000001',
      password: defaultPassword,
      name: companyName,
      role: 'ENTREPRISE',
      isVerified: true,
      photoUrl: faker.image.urlPicsumPhotos({ width: 200, height: 200 }),
    },
  });
  console.log('Entreprise: test-entreprise@bolo237.com');

  for (let index = 0; index < 5; index += 1) {
    await prisma.job.create({
      data: {
        title: faker.person.jobTitle(),
        company: companyName,
        location: faker.helpers.arrayElement(['Douala', 'Yaounde', 'Bafoussam']),
        description: faker.lorem.paragraphs(2),
        salary: '250 000 FCFA',
        status: 'APPROVED',
        authorId: entreprise.id,
      },
    });
  }

  const artisan = await prisma.user.create({
    data: {
      email: 'test-artisan@bolo237.com',
      phone: '+237600000002',
      password: defaultPassword,
      name: faker.person.fullName(),
      role: 'ARTISAN',
      isVerified: true,
      contactClicks: 14,
    },
  });

  await prisma.userProfile.create({
    data: {
      userId: artisan.id,
      fullName: artisan.name,
      title: 'Plombier Chauffagiste',
      location: 'Douala',
      phone: artisan.phone,
      profile: faker.lorem.paragraph(),
      skillsText: 'Plomberie, Tuyauterie',
    },
  });

  const artisanClickEvents = Array.from({ length: 14 }, (_, index) => {
    const createdAt = new Date();
    createdAt.setHours(9 + (index % 6), 0, 0, 0);
    createdAt.setDate(createdAt.getDate() - (index % 7));

    return {
      artisanId: artisan.id,
      createdAt,
    };
  });

  await prisma.contactClickEvent.createMany({
    data: artisanClickEvents,
  });
  console.log('Artisan: test-artisan@bolo237.com');

  const candidat = await prisma.user.create({
    data: {
      email: 'test-candidat@bolo237.com',
      phone: '+237600000003',
      password: defaultPassword,
      name: faker.person.fullName(),
      role: 'CANDIDAT',
      isVerified: true,
    },
  });

  await prisma.userProfile.create({
    data: {
      userId: candidat.id,
      fullName: candidat.name,
      title: 'Developpeur Web Frontend',
      location: 'Yaounde',
      phone: candidat.phone,
      profile: faker.lorem.paragraph(),
      skillsText: 'React, Next.js, Node.js',
    },
  });
  console.log('Candidat: test-candidat@bolo237.com');

  console.log('Seed completed successfully. Password for all accounts: Test1234!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
