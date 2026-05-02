require('dotenv').config();

const { prisma, pool } = require('../lib/db');

const API_BASE_URL = String(process.env.API_BASE_URL || 'https://api-237jobs.onrender.com').trim().replace(/\/+$/, '');
const API_ORIGIN = String(process.env.API_ORIGIN || 'https://www.bolo237.com').trim();
const ADMIN_EMAIL = String(process.env.ADMIN_BACKEND_EMAIL || 'admin@bolo237.com').trim().toLowerCase();
const ADMIN_PASSWORD = String(process.env.ADMIN_BACKEND_PASSWORD || '').trim();

const ARTISAN_EMAIL = 'artisan-test-e2e@bolo237.com';
const RECRUTEUR_EMAIL = 'recruteur-test-e2e@bolo237.com';
const ARTISAN_PHONE = '+237699000111';
const RECRUTEUR_PHONE = '+237699000222';
const TEST_PASSWORD = String(process.env.E2E_TEST_PASSWORD || 'E2eBolo237!2026').trim();

const failures = [];
let prismaReady = false;
const state = {
  artisanUserId: null,
  recruteurUserId: null,
  testJobId: null,
  adminCookie: '',
};

function nowTag() {
  return new Date().toISOString();
}

function logStep(step, message) {
  console.log(`[${nowTag()}] [${step}] ${message}`);
}

function logOk(step, message) {
  console.log(`[${nowTag()}] [${step}] [OK] ${message}`);
}

function logFail(step, message) {
  console.error(`[${nowTag()}] [${step}] [FAIL] ${message}`);
  failures.push(`${step}: ${message}`);
}

function parseCookieFromResponse(response) {
  const setCookie = String(response.headers.get('set-cookie') || '').trim();
  if (!setCookie) return '';
  const firstPair = setCookie.split(';')[0] || '';
  return firstPair.trim();
}

async function apiRequest(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (method !== 'GET' && method !== 'HEAD') {
    headers.set('Origin', API_ORIGIN);
    if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const controller = new AbortController();
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 45000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: options.body,
      signal: controller.signal,
    });

    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    return {
      status: response.status,
      ok: response.ok,
      headers: response.headers,
      json,
      text,
      cookie: parseCookieFromResponse(response),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function cleanupStaleTestData() {
  logStep('SETUP', 'Nettoyage prealable des donnees e2e existantes');

  if (!prismaReady) {
    logFail('SETUP', 'Prisma indisponible: nettoyage prealable saute.');
    return;
  }

  const existingUsers = await prisma.user.findMany({
    where: { email: { in: [ARTISAN_EMAIL, RECRUTEUR_EMAIL] } },
    select: { id: true, email: true },
  });

  const userIds = existingUsers.map((u) => u.id);

  if (userIds.length > 0) {
    await prisma.job.deleteMany({ where: { authorId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  logOk('SETUP', `Nettoyage prealable termine (users supprimes: ${userIds.length})`);
}

async function testPublicJobs() {
  const step = 'PUBLIC-JOBS';
  logStep(step, 'GET /api/jobs (offres approuvees)');

  const res = await apiRequest('/api/jobs?limit=5');
  if (res.status !== 200) {
    logFail(step, `Status attendu 200, recu ${res.status}`);
    return;
  }

  const jobs = Array.isArray(res.json?.jobs) ? res.json.jobs : [];
  if (jobs.length === 0) {
    logFail(step, 'Aucune offre remontee');
    return;
  }

  const sample = jobs[0] || {};
  const requiredKeys = ['id', 'title', 'description', 'titleFr', 'titleEn', 'descriptionFr', 'descriptionEn', 'status'];
  const missing = requiredKeys.filter((k) => !(k in sample));
  if (missing.length > 0) {
    logFail(step, `Champs manquants dans payload jobs: ${missing.join(', ')}`);
    return;
  }

  logOk(step, `Status 200 et structure bilingue valide (jobs recus: ${jobs.length})`);
}

async function signupAndLoginArtisan() {
  const step = 'ARTISAN';
  logStep(step, 'POST /api/users inscription artisan temporaire');

  const signupRes = await apiRequest('/api/users', {
    method: 'POST',
    body: JSON.stringify({
      email: ARTISAN_EMAIL,
      password: TEST_PASSWORD,
      name: 'Artisan Test E2E',
      role: 'ARTISAN',
      phone: ARTISAN_PHONE,
    }),
    timeoutMs: 60000,
  });

  if (![200, 201].includes(signupRes.status)) {
    logFail(step, `Inscription artisan echouee (status ${signupRes.status}) ${JSON.stringify(signupRes.json || signupRes.text)}`);
    return null;
  }

  state.artisanUserId = Number(signupRes.json?.id || 0) || null;
  logOk(step, `Inscription artisan OK (status ${signupRes.status}, id=${state.artisanUserId || 'n/a'})`);

  const loginRes = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: ARTISAN_EMAIL, password: TEST_PASSWORD }),
  });

  if (loginRes.status !== 200 || !loginRes.cookie) {
    logFail(step, `Connexion artisan echouee (status ${loginRes.status})`);
    return null;
  }

  logOk(step, 'Connexion artisan OK (cookie session recu)');
  return loginRes.cookie;
}

async function signupLoginRecruiterAndCreateJob() {
  const step = 'RECRUTEUR';
  logStep(step, 'POST /api/users inscription recruteur temporaire');

  const signupRes = await apiRequest('/api/users', {
    method: 'POST',
    body: JSON.stringify({
      email: RECRUTEUR_EMAIL,
      password: TEST_PASSWORD,
      name: 'Entreprise Test E2E',
      role: 'ENTREPRISE',
      phone: RECRUTEUR_PHONE,
    }),
    timeoutMs: 60000,
  });

  if (![200, 201].includes(signupRes.status)) {
    logFail(step, `Inscription recruteur echouee (status ${signupRes.status}) ${JSON.stringify(signupRes.json || signupRes.text)}`);
    return;
  }

  state.recruteurUserId = Number(signupRes.json?.id || 0) || null;
  logOk(step, `Inscription recruteur OK (status ${signupRes.status}, id=${state.recruteurUserId || 'n/a'})`);

  const loginRes = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: RECRUTEUR_EMAIL, password: TEST_PASSWORD }),
  });

  if (loginRes.status !== 200 || !loginRes.cookie) {
    logFail(step, `Connexion recruteur echouee (status ${loginRes.status})`);
    return;
  }

  logOk(step, 'Connexion recruteur OK (cookie session recu)');

  const jobTitle = 'Developpeur Full Stack - Test E2E';
  const jobDescription = 'Nous recherchons un developpeur full stack confirme pour une mission test E2E en production avec forte capacite d execution et bonne communication.';

  const createRes = await apiRequest('/api/jobs', {
    method: 'POST',
    headers: { Cookie: loginRes.cookie },
    body: JSON.stringify({
      title: jobTitle,
      description: jobDescription,
      location: 'Douala',
      company: 'Bolo237 QA E2E',
      salary: '450000 FCFA',
    }),
    timeoutMs: 60000,
  });

  if (![200, 201].includes(createRes.status)) {
    logFail(step, `Creation offre echouee (status ${createRes.status}) ${JSON.stringify(createRes.json || createRes.text)}`);
    return;
  }

  const job = createRes.json?.job || {};
  state.testJobId = Number(job.id || 0) || null;

  const hasTranslations =
    typeof job.titleFr === 'string' && job.titleFr.trim().length > 0 &&
    typeof job.titleEn === 'string' && job.titleEn.trim().length > 0 &&
    typeof job.descriptionFr === 'string' && job.descriptionFr.trim().length > 0 &&
    typeof job.descriptionEn === 'string' && job.descriptionEn.trim().length > 0;

  if (!hasTranslations) {
    logFail(step, `Offre creee mais champs de traduction manquants (jobId=${state.testJobId || 'n/a'})`);
    return;
  }

  logOk(step, `Creation offre OK avec traduction auto (status ${createRes.status}, jobId=${state.testJobId})`);
}

async function loginAdminAndGetCookie() {
  const loginRes = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  if (loginRes.status !== 200 || !loginRes.cookie) {
    return null;
  }

  state.adminCookie = loginRes.cookie;
  return loginRes.cookie;
}

async function testAdminFlow() {
  const step = 'ADMIN';
  logStep(step, 'POST /api/auth/login admin + GET route protegee');

  if (!ADMIN_PASSWORD) {
    logFail(step, 'ADMIN_BACKEND_PASSWORD absent. Impossible de tester le flux admin.');
    return;
  }

  const adminCookie = await loginAdminAndGetCookie();
  if (!adminCookie) {
    logFail(step, 'Connexion admin echouee (cookie session absent ou credentials invalides)');
    return;
  }

  const dashboardRes = await apiRequest('/api/admin/users?page=1&limit=5', {
    method: 'GET',
    headers: { Cookie: adminCookie },
  });

  if (dashboardRes.status !== 200) {
    logFail(step, `Route admin protegee echouee (status ${dashboardRes.status}) ${JSON.stringify(dashboardRes.json || dashboardRes.text)}`);
    return;
  }

  const users = Array.isArray(dashboardRes.json?.users) ? dashboardRes.json.users : [];
  logOk(step, `Flux admin OK (route protegee accessee, users recu: ${users.length})`);
}

async function cleanupViaAdminApi() {
  const step = 'TEARDOWN-API';
  if (!ADMIN_PASSWORD) {
    logFail(step, 'ADMIN_BACKEND_PASSWORD absent: nettoyage API impossible.');
    return;
  }

  const adminCookie = state.adminCookie || (await loginAdminAndGetCookie());
  if (!adminCookie) {
    logFail(step, 'Connexion admin impossible: nettoyage API impossible.');
    return;
  }

  const targets = [ARTISAN_EMAIL, RECRUTEUR_EMAIL];

  for (const targetEmail of targets) {
    const searchRes = await apiRequest(`/api/admin/users?search=${encodeURIComponent(targetEmail)}&limit=20`, {
      method: 'GET',
      headers: { Cookie: adminCookie },
    });

    if (searchRes.status !== 200) {
      logFail(step, `Recherche user e2e echouee pour ${targetEmail} (status ${searchRes.status})`);
      continue;
    }

    const users = Array.isArray(searchRes.json?.users) ? searchRes.json.users : [];
    const matches = users.filter((u) => String(u?.email || '').toLowerCase() === targetEmail.toLowerCase());

    for (const user of matches) {
      const deleteRes = await apiRequest(`/api/users/${user.id}`, {
        method: 'DELETE',
        headers: { Cookie: adminCookie },
      });

      if (deleteRes.status === 200) {
        logOk(step, `User de test supprime via API admin: ${targetEmail} (id=${user.id})`);
      } else {
        logFail(step, `Suppression user de test echouee ${targetEmail} (id=${user.id}, status ${deleteRes.status})`);
      }
    }
  }
}

async function teardown() {
  const step = 'TEARDOWN';
  logStep(step, 'Suppression offre et comptes de test via Prisma');

  if (!prismaReady) {
    logFail(step, 'Prisma indisponible: fallback nettoyage via API admin.');
    await cleanupViaAdminApi();
    return;
  }

  try {
    if (state.testJobId) {
      await prisma.job.deleteMany({ where: { id: state.testJobId } });
    }

    await prisma.job.deleteMany({
      where: {
        OR: [
          { company: 'Bolo237 QA E2E' },
          { author: { email: RECRUTEUR_EMAIL } },
        ],
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: { in: [ARTISAN_EMAIL, RECRUTEUR_EMAIL] },
      },
    });

    logOk(step, 'Nettoyage termine (offre + utilisateurs de test supprimes)');
  } catch (error) {
    logFail(step, `Echec nettoyage: ${error?.message || error}`);
  }
}

async function verifyPrismaConnection() {
  const step = 'PRISMA';
  logStep(step, 'Verification de la connexion DB pour setup/teardown');
  try {
    await prisma.$queryRaw`SELECT 1`;
    prismaReady = true;
    logOk(step, 'Connexion Prisma OK');
  } catch (error) {
    prismaReady = false;
    logFail(step, `Connexion Prisma KO: ${error?.message || error}`);
  }
}

async function run() {
  const started = Date.now();
  console.log('======================================================');
  console.log('Bolo237 API E2E Health Check');
  console.log(`Base URL: ${API_BASE_URL}`);
  console.log(`Origin: ${API_ORIGIN}`);
  console.log('======================================================');

  try {
    await verifyPrismaConnection();
    await cleanupStaleTestData();
    await testPublicJobs();
    await signupAndLoginArtisan();
    await signupLoginRecruiterAndCreateJob();
    await testAdminFlow();
  } catch (error) {
    logFail('RUN', `Erreur inattendue: ${error?.message || error}`);
  } finally {
    await teardown();
    await prisma.$disconnect();
    await pool.end();
  }

  const durationSec = ((Date.now() - started) / 1000).toFixed(1);

  console.log('======================================================');
  console.log(`Duree: ${durationSec}s`);

  if (failures.length === 0) {
    console.log('[GLOBAL] [OK] Tous les flux critiques sont operationnels.');
    console.log('======================================================');
    process.exit(0);
  }

  console.error('[GLOBAL] [FAIL] Des regressions ont ete detectees:');
  failures.forEach((failure, idx) => console.error(`  ${idx + 1}. ${failure}`));
  console.log('======================================================');
  process.exit(1);
}

run();
