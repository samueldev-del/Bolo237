/**
 * Bolo237 — Seed de demarrage
 * Lance: node seed.js
 * Cree 5 entreprises + 5 offres d'emploi professionnelles
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

require('dotenv').config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('🌱 Bolo237 Seed — Demarrage...\n');

  // ─── 5 Entreprises seed (avec logos officiels) ───
  const companies = [
    {
      email: 'rh@nexttel-cameroun.cm',
      password: bcrypt.hashSync('Bolo237!', 10),
      name: 'Nexttel Cameroun',
      role: 'ENTREPRISE',
      phone: '+237650000001',
      isVerified: true,
      photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Nexttel_logo.png/200px-Nexttel_logo.png',
    },
    {
      email: 'recrutement@orangecm.com',
      password: bcrypt.hashSync('Bolo237!', 10),
      name: 'Orange Cameroun',
      role: 'ENTREPRISE',
      phone: '+237650000002',
      isVerified: true,
      photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Orange_logo.svg/200px-Orange_logo.svg.png',
    },
    {
      email: 'jobs@afrilandfirstbank.com',
      password: bcrypt.hashSync('Bolo237!', 10),
      name: 'Afriland First Bank',
      role: 'ENTREPRISE',
      phone: '+237650000003',
      isVerified: true,
      photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Afriland_First_Bank_logo.png/200px-Afriland_First_Bank_logo.png',
    },
    {
      email: 'talent@totalenergies-cm.com',
      password: bcrypt.hashSync('Bolo237!', 10),
      name: 'TotalEnergies Cameroun',
      role: 'ENTREPRISE',
      phone: '+237650000004',
      isVerified: true,
      photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/TotalEnergies_logo.svg/200px-TotalEnergies_logo.svg.png',
    },
    {
      email: 'carrieres@bollorecm.com',
      password: bcrypt.hashSync('Bolo237!', 10),
      name: 'Bollore Transport & Logistics',
      role: 'ENTREPRISE',
      phone: '+237650000005',
      isVerified: true,
      photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Bollor%C3%A9_logo.svg/200px-Bollor%C3%A9_logo.svg.png',
    },
  ];

  const createdCompanies = [];
  for (const c of companies) {
    const existing = await prisma.user.findUnique({ where: { email: c.email } });
    if (existing) {
      // Mettre a jour le logo et le badge si necessaire
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { photoUrl: c.photoUrl, isVerified: true },
      });
      console.log(`  🔄 ${c.name} mis a jour (ID ${existing.id}) — logo + badge`);
      createdCompanies.push(updated);
    } else {
      const user = await prisma.user.create({ data: c });
      console.log(`  ✅ ${c.name} cree (ID ${user.id})`);
      createdCompanies.push(user);
    }
  }

  console.log('');

  // ─── 5 Offres d'emploi professionnelles ───
  const jobs = [
    {
      title: 'Developpeur Full-Stack Senior — React / Node.js',
      company: 'Nexttel Cameroun',
      location: 'Douala, Cameroun',
      salary: '800 000 - 1 500 000 FCFA / mois',
      status: 'APPROVED',
      authorIdx: 0,
      description: `🚀 Nexttel Cameroun recrute un Developpeur Full-Stack Senior !

📍 Lieu : Douala, Bonanjo — Siege social
📝 Contrat : CDI — Temps plein
💰 Remuneration : 800 000 a 1 500 000 FCFA/mois selon experience

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 A PROPOS DE NEXTTEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3e operateur telecom du Cameroun, Nexttel investit massivement dans la transformation digitale de ses services. Rejoignez une equipe tech ambitieuse qui construit les produits numeriques de demain.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 VOTRE MISSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Concevoir et developper des applications web et mobiles performantes
• Architecturer des APIs RESTful scalables (Node.js, Express)
• Creer des interfaces modernes avec React / Next.js
• Collaborer avec les equipes Produit, Design et DevOps
• Mettre en place des tests automatises et du CI/CD
• Mentorer les developpeurs juniors de l'equipe

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PROFIL RECHERCHE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Bac+3/5 en Informatique ou equivalent
• 3 ans d'experience minimum en developpement web
• Maitrise de React, Node.js, TypeScript, PostgreSQL
• Experience avec Git, Docker, methodes Agile
• Bonus : connaissances en React Native, AWS, ou GraphQL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎁 AVANTAGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Forfait telephonique et data illimite
• Assurance sante complete (famille incluse)
• Teletravail partiel (2j/semaine)
• Budget formation annuel de 500 000 FCFA
• Prime de performance trimestrielle

📩 Postulez directement sur Bolo237 — votre dossier sera transmis a notre equipe RH sous 48h.`,
    },
    {
      title: 'Responsable Marketing Digital',
      company: 'Orange Cameroun',
      location: 'Yaounde, Cameroun',
      salary: '1 000 000 - 1 800 000 FCFA / mois',
      status: 'APPROVED',
      authorIdx: 1,
      description: `🟠 Orange Cameroun recrute un(e) Responsable Marketing Digital !

📍 Lieu : Yaounde, Quartier Hippodrome — Direction Generale
📝 Contrat : CDI — Cadre superieur
💰 Remuneration : 1 000 000 a 1 800 000 FCFA/mois + avantages

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 A PROPOS D'ORANGE CAMEROUN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Leader des telecommunications au Cameroun avec plus de 8 millions d'abonnes, Orange Cameroun est au coeur de la revolution numerique africaine. Nous recherchons des talents audacieux pour porter notre strategie digitale.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 VOS RESPONSABILITES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Piloter la strategie marketing digital (SEO, SEA, Social Media)
• Gerer un budget media de 50M+ FCFA/trimestre
• Analyser les KPIs de performance (Google Analytics, Meta Business)
• Concevoir des campagnes creatives multi-canaux
• Manager une equipe de 4 personnes (Community Manager, Graphiste, Media Buyer, Analyste)
• Coordonner avec les agences partenaires

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PROFIL IDEAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Bac+4/5 Marketing, Communication digitale ou Commerce
• 5 ans d'experience en marketing digital dont 2 en management
• Expertise : Google Ads, Meta Ads, TikTok Ads, Email marketing
• Excellente capacite redactionnelle (francais + anglais)
• Esprit analytique et creatif
• Connaissance du marche camerounais est un plus majeur

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎁 CE QUE NOUS OFFRONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Vehicule de fonction
• Assurance sante premium internationale
• 13eme mois garanti
• Forfait Orange illimite (voix + data)
• Participation aux evenements Orange au niveau international
• Environnement multiculturel et stimulant

📩 Deposez votre candidature sur Bolo237 — reponse garantie sous 7 jours ouvres.`,
    },
    {
      title: 'Charge(e) de Clientele — Agence Premium',
      company: 'Afriland First Bank',
      location: 'Douala, Cameroun',
      salary: '500 000 - 900 000 FCFA / mois',
      status: 'APPROVED',
      authorIdx: 2,
      description: `🏦 Afriland First Bank recrute un(e) Charge(e) de Clientele Premium !

📍 Lieu : Douala, Boulevard de la Liberte — Agence Prestige
📝 Contrat : CDI — Temps plein
💰 Remuneration : 500 000 a 900 000 FCFA/mois + primes sur objectifs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 A PROPOS D'AFRILAND FIRST BANK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1ere banque privee du Cameroun et pilier du systeme bancaire en Afrique centrale, Afriland First Bank accompagne les entrepreneurs et les particuliers depuis plus de 35 ans. Notre agence Premium de Douala recherche un talent pour accompagner nos clients a forte valeur ajoutee.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 VOS MISSIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Gerer et developper un portefeuille de 150+ clients Premium
• Proposer des solutions d'epargne, de credit et d'investissement personnalisees
• Atteindre les objectifs commerciaux (collecte, placement, credits)
• Assurer un service d'excellence et une relation de confiance durable
• Identifier les opportunites de vente croisee (assurance, mobile banking)
• Participer aux evenements clients VIP

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ VOTRE PROFIL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Bac+3/4 Banque, Finance, Gestion ou Commerce
• 2 ans d'experience en relation client banque ou assurance
• Sens commercial develppe et orientation resultats
• Presentation soignee et excellent relationnel
• Maitrise du francais (l'anglais est un atout)
• Bonne connaissance des produits bancaires

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎁 AVANTAGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Prime de performance mensuelle (jusqu'a 300 000 FCFA)
• Assurance maladie et prevoyance
• Compte bancaire gratuit avec avantages preferentiels
• Formation continue certifiante (ITB, marches financiers)
• Possibilite d'evolution rapide vers Chef d'agence

📩 Postulez via Bolo237 — notre equipe RH vous contactera dans les 5 jours.`,
    },
    {
      title: 'Ingenieur HSE — Plateforme Petroliere',
      company: 'TotalEnergies Cameroun',
      location: 'Kribi / Douala, Cameroun',
      salary: '1 200 000 - 2 500 000 FCFA / mois',
      status: 'APPROVED',
      authorIdx: 3,
      description: `⛽ TotalEnergies Cameroun recrute un(e) Ingenieur HSE !

📍 Lieu : Kribi (site) / Douala (bureau) — Rotation 28/28
📝 Contrat : CDI — Cadre
💰 Remuneration : 1 200 000 a 2 500 000 FCFA/mois + indemnites terrain

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 A PROPOS DE TOTALENERGIES CAMEROUN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Acteur majeur du secteur petrolier et energetique au Cameroun depuis plus de 70 ans, TotalEnergies investit dans les energies renouvelables tout en poursuivant l'exploitation responsable des ressources naturelles. Rejoignez un groupe international engage pour une transition energetique durable.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 VOS RESPONSABILITES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Garantir le respect des normes HSE sur les sites operationnels
• Realiser des audits de securite et des inspections terrain regulieres
• Former le personnel aux procedures de securite et aux gestes d'urgence
• Analyser les incidents et proposer des plans d'actions correctives
• Assurer la conformite reglementaire (normes camerounaises et internationales)
• Reporter a la Direction HSE Afrique Centrale

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PROFIL REQUIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Bac+5 en Ingenierie HSE, Environnement ou equivalent
• 4 ans d'experience minimum dans l'industrie petroliere/gaziere
• Certifications : NEBOSH, ISO 14001, ISO 45001 (un plus majeur)
• Connaissance des reglementations HSE camerounaises et OHSAS
• Bilingue francais/anglais obligatoire
• Permis B — Aptitude au travail en zone isolee

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎁 PACKAGE ATTRACTIF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Indemnites d'expatriation et de terrain
• Logement et transport pris en charge sur site
• Assurance sante internationale (famille incluse)
• Billet d'avion annuel vers le pays d'origine
• Plan d'epargne entreprise avec abondement
• 45 jours de conges par an (rotation incluse)

📩 Candidatez sur Bolo237 — processus de recrutement en 3 etapes sous 3 semaines.`,
    },
    {
      title: 'Chef de Projet Logistique — Supply Chain',
      company: 'Bollore Transport & Logistics',
      location: 'Douala, Cameroun',
      salary: '900 000 - 1 600 000 FCFA / mois',
      status: 'APPROVED',
      authorIdx: 4,
      description: `📦 Bollore Transport & Logistics recrute un(e) Chef de Projet Logistique !

📍 Lieu : Douala, Zone Portuaire — Port Autonome de Douala
📝 Contrat : CDI — Cadre confirme
💰 Remuneration : 900 000 a 1 600 000 FCFA/mois + avantages groupe

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 A PROPOS DE BOLLORE T&L
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
N1 de la logistique en Afrique, Bollore Transport & Logistics opere dans 46 pays et gere les plus grands terminaux portuaires du continent. Notre hub de Douala est strategique pour l'Afrique Centrale. Nous cherchons un(e) expert(e) logistique pour piloter nos projets d'envergure.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 VOS MISSIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Piloter les projets logistiques de bout en bout (import/export)
• Coordonner les operations portuaires, transit et transport
• Optimiser les couts et delais de la chaine d'approvisionnement
• Gerer les relations avec les clients grands comptes (multinationales)
• Manager une equipe de 8 a 12 collaborateurs (transit, douane, transport)
• Assurer le reporting et le suivi des KPIs operationnels
• Negocier avec les compagnies maritimes et les transitaires

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PROFIL RECHERCHE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Bac+4/5 en Logistique, Supply Chain, Commerce international
• 4 ans d'experience en gestion de projets logistiques
• Connaissance approfondie des INCOTERMS et procedures douanieres CEMAC
• Maitrise des outils : SAP, TMS, WMS
• Leadership et capacite a gerer des equipes pluridisciplinaires
• Bilingue francais/anglais — le pidgin est un plus !

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎁 AVANTAGES BOLLORE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 14eme mois + prime de bilan annuelle
• Assurance sante groupe (couverture famille)
• Vehicule de service
• Restaurant d'entreprise subventionne
• Plan de carriere international (mobilite Afrique/Europe)
• Formation continue (supply chain, management, digital)

📩 Postulez maintenant sur Bolo237 — integration possible des le mois prochain !`,
    },
  ];

  for (const job of jobs) {
    const author = createdCompanies[job.authorIdx];
    const existing = await prisma.job.findFirst({
      where: { title: job.title, company: job.company },
    });
    if (existing) {
      console.log(`  ⏭️  "${job.title}" existe deja (ID ${existing.id})`);
      continue;
    }
    const created = await prisma.job.create({
      data: {
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description,
        salary: job.salary,
        status: job.status,
        authorId: author.id,
      },
    });
    console.log(`  ✅ "${job.title}" cree (ID ${created.id})`);
  }

  console.log('\n🎉 Seed termine avec succes !');
  console.log('   5 entreprises certifiees + 5 offres d\'emploi APPROVED');
  console.log('   Les offres sont visibles immediatement sur la vitrine.\n');

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error('❌ Erreur seed:', err);
  process.exit(1);
});
