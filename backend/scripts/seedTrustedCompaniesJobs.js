const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

require('dotenv').config();

const careers = [
  {
    company: 'MTN Cameroon',
    email: 'careers+mtn@bolo237.com',
    phone: '+237650100001',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/93/New-mtn-logo.svg',
    title: 'Talent Pool 2026 - Operations, Sales and Digital Services',
    location: 'Douala / Yaounde, Cameroun',
    salary: 'Selon grille interne',
    applyUrl: 'https://www.linkedin.com/company/mtn-cameroon/jobs/',
    sourceUrl: 'https://www.mtn.com/careers/',
    summary:
      'MTN Cameroon renforce ses equipes sur des fonctions operations reseau, ventes B2B/B2C et services digitaux. Profil recherche: experience telecom ou digital, orientation client, et capacite a travailler sur des objectifs de performance.',
  },
  {
    company: 'Orange Cameroun',
    email: 'careers+orange@bolo237.com',
    phone: '+237650100002',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Orange_logo.svg',
    title: 'Opportunites Orange Cameroun - Data, Marketing et Technique',
    location: 'Douala / Yaounde, Cameroun',
    salary: 'Selon poste et experience',
    applyUrl: 'https://orange.jobs/fr',
    sourceUrl: 'https://www.orange.cm/fr/carrieres',
    summary:
      'Orange Cameroun ouvre regulierement des postes sur les metiers data, marketing digital, relation client et exploitation technique. Les profils analyses, tech et commerciaux avec forte culture resultats sont privilegies.',
  },
  {
    company: 'SABC - Boissons du Cameroun',
    email: 'careers+sabc@bolo237.com',
    phone: '+237650100003',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/fr/4/4d/Boissons_du_Cameroun_logo.png',
    title: 'Recrutement SABC - Production, Qualite et Distribution',
    location: 'Douala / Yaounde / Bafoussam, Cameroun',
    salary: 'Selon convention interne',
    applyUrl: 'https://www.linkedin.com/company/sabc-boissons-du-cameroun/jobs/',
    sourceUrl: 'https://www.sabc-group.com/en/careers/',
    summary:
      'SABC recrute des profils pour la production industrielle, le controle qualite et la distribution. Une experience en agroalimentaire ou environnement industriel est un avantage important.',
  },
  {
    company: 'Afriland First Bank',
    email: 'careers+afriland@bolo237.com',
    phone: '+237650100004',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Afriland_First_Bank_logo.png',
    title: 'Opportunites Afriland - Banque de detail et Corporate',
    location: 'Douala / Yaounde, Cameroun',
    salary: 'Selon poste',
    applyUrl: 'https://www.linkedin.com/company/afriland-first-bank/jobs/',
    sourceUrl: 'https://www.afrilandfirstbank.com/',
    summary:
      'Afriland First Bank recherche des profils banque de detail, relation entreprises, gestion des risques et conformite. Les candidats avec base finance/banque et sens commercial sont cibles.',
  },
  {
    company: 'Ecobank Cameroon',
    email: 'careers+ecobank@bolo237.com',
    phone: '+237650100005',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Ecobank_logo.svg',
    title: 'Ecobank - Experienced Professionals (Cameroon/Africa)',
    location: 'Douala / Yaounde / Regional',
    salary: 'Competitive package',
    applyUrl: 'https://fa-emqf-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1004/jobs',
    sourceUrl: 'https://www.ecobank.com/group/about/careers',
    summary:
      'Ecobank publie des opportunites pour professionnels experimentes sur la banque commerciale, digitale et fonctions support. Les postes varient selon pays et filiales du groupe.',
  },
  {
    company: 'Eneo Cameroon',
    email: 'careers+eneo@bolo237.com',
    phone: '+237650100006',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/fr/2/29/Eneo_Cameroon_logo.png',
    title: 'Eneo - Ingenierie electrique et maintenance reseaux',
    location: 'Douala / Yaounde / Regions, Cameroun',
    salary: 'Selon grille interne',
    applyUrl: 'https://www.linkedin.com/company/eneo-cameroon/jobs/',
    sourceUrl: 'https://eneocameroon.cm/',
    summary:
      'Eneo recrute regulierement des techniciens et ingenieurs pour exploitation, maintenance et performance du reseau electrique. Rigueur securite et maitrise technique sont essentielles.',
  },
  {
    company: 'TotalEnergies Cameroun',
    email: 'careers+total@bolo237.com',
    phone: '+237650100007',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/77/TotalEnergies_logo.svg',
    title: 'TotalEnergies - Metiers Energie, HSE et Retail',
    location: 'Douala / Kribi / Cameroun',
    salary: 'Selon poste et experience',
    applyUrl: 'https://careers.totalenergies.com/',
    sourceUrl: 'https://totalenergies.cm/en/careers',
    summary:
      'TotalEnergies recherche des profils pour operations energie, securite HSE, maintenance et reseau stations. Une forte culture securite et conformite est attendue.',
  },
  {
    company: 'Dangote Cement Cameroon',
    email: 'careers+dangote@bolo237.com',
    phone: '+237650100008',
    logoUrl: 'https://www.dangotecement.com/wp-content/uploads/2021/03/small_Dangote-Cement-logo-1-1.png',
    title: 'Dangote Cement - Operations industrielles et maintenance',
    location: 'Douala / Littoral, Cameroun',
    salary: 'Selon poste',
    applyUrl: 'https://www.dangotecement.com/careers/',
    sourceUrl: 'https://www.dangotecement.com/career/',
    summary:
      'Dangote Cement recrute des profils production, maintenance, supply chain et supervision d operations. Les candidats avec experience cimenterie/industrie lourde sont privilegies.',
  },
  {
    company: 'Nestle Cameroun',
    email: 'careers+nestle@bolo237.com',
    phone: '+237650100009',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/16/Nestl%C3%A9.svg',
    title: 'Nestle CWA - Fonctions commerciales, qualite et supply',
    location: 'Douala / Yaounde, Cameroun',
    salary: 'Selon role',
    applyUrl: 'https://www.nestle-cwa.com/en/jobs/search-jobs',
    sourceUrl: 'https://www.nestle-cwa.com/en/jobs',
    summary:
      'Nestle recrute sur les metiers ventes, chaine logistique, qualite et support operations. Les profils FMCG avec culture execution et amelioration continue sont recherches.',
  },
  {
    company: 'IHS Towers',
    email: 'careers+ihs@bolo237.com',
    phone: '+237650100010',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/IHS_Holding_logo.svg',
    title: 'IHS Towers - Telecom Infrastructure and Field Operations',
    location: 'Cameroun / Afrique centrale',
    salary: 'Competitive package',
    applyUrl: 'https://www.ihstowers.com/careers/',
    sourceUrl: 'https://www.ihstowers.com/careers/',
    summary:
      'IHS Towers renforce ses equipes infrastructure telecom sur operations terrain, maintenance energetique et performance reseau. Profil technique telecom/energie recommande.',
  },
];

function buildJobDescription(item) {
  const verifiedAt = '15/04/2026';

  return [
    `Entreprise: ${item.company}`,
    `Verification Bolo237: ${verifiedAt}`,
    '',
    item.summary,
    '',
    'Offre de veille recrutement: cette fiche est publiee sur Bolo237 pour orienter les candidats vers la candidature officielle de l entreprise.',
    '',
    `Source officielle: ${item.sourceUrl}`,
    'Annonce reference: consultez la page carriere officielle pour voir le poste actif le plus recent.',
    `Postuler sur le site de l'entreprise: ${item.applyUrl}`,
  ].join('\n');
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL manquant.');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Seeding trusted company listings for Bolo237...');

    for (const item of careers) {
      const user = await prisma.user.upsert({
        where: { email: item.email },
        update: {
          name: item.company,
          role: 'ENTREPRISE',
          isVerified: true,
          photoUrl: item.logoUrl,
          phone: item.phone,
        },
        create: {
          email: item.email,
          password: bcrypt.hashSync('Bolo237!trusted', 10),
          name: item.company,
          role: 'ENTREPRISE',
          isVerified: true,
          photoUrl: item.logoUrl,
          phone: item.phone,
        },
      });

      const existingJob = await prisma.job.findFirst({
        where: {
          title: item.title,
          company: item.company,
        },
      });

      const data = {
        title: item.title,
        company: item.company,
        location: item.location,
        salary: item.salary,
        description: buildJobDescription(item),
        status: 'APPROVED',
        authorId: user.id,
      };

      if (existingJob) {
        await prisma.job.update({
          where: { id: existingJob.id },
          data,
        });
        console.log(`Updated listing: ${item.company}`);
      } else {
        await prisma.job.create({ data });
        console.log(`Created listing: ${item.company}`);
      }
    }

    console.log('Done.');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('seedTrustedCompaniesJobs failed:', error);
  process.exit(1);
});
