require("dotenv").config();
const { prisma, pool } = require("../lib/db");
const { generateSlug } = require("../lib/jobSlug");

async function main() {
  console.log("Backfill job slugs: démarrage...");
  const jobs = await prisma.job.findMany({
    where: { slug: null },
    select: {
      id: true,
      title: true,
      titleEn: true,
      titleFr: true,
      location: true,
      reference: true,
    },
  });
  console.log(`${jobs.length} jobs à traiter...`);
  for (const job of jobs) {
    const title = job.titleEn || job.titleFr || job.title || "";
    const slug = generateSlug(title, job.location, job.reference);
    try {
      await prisma.job.update({ where: { id: job.id }, data: { slug } });
      console.log(`✓ ${job.reference} → ${slug}`);
    } catch (e) {
      console.error(`✗ ${job.reference}: ${e.message}`);
    }
  }
  console.log("Backfill terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    if (pool) await pool.end();
  });
