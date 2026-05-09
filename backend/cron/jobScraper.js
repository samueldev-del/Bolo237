'use strict';

const path = require('path');
const crypto = require('crypto');
const cron = require('node-cron');
const axios = require('axios');
const cheerio = require('cheerio');
const dotenv = require('dotenv');
const { generateJobReference } = require('../lib/references');
const { generateSlug } = require('../lib/jobSlug');
const { assertPublicHttpsUrl } = require('../lib/urlGuard');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });

const VALID_JOB_STATUSES = new Set(['PENDING', 'ACTIVE', 'APPROVED', 'REJECTED', 'CLOSED', 'ARCHIVED']);
const DEFAULT_HEADERS = {
  'User-Agent': 'Bolo237JobScraper/1.0 (+https://bolo237.com)',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
};

// Template d’une source. Duplique cet objet et remplace les URL / sélecteurs CSS.
const SCRAPER_SITES = [
  {
    name: 'SiteX',
    enabled: String(process.env.JOB_SCRAPER_SITE_X_ENABLED || 'false').trim().toLowerCase() === 'true',
    pageUrls: [String(process.env.JOB_SCRAPER_SITE_X_URL || 'https://example.com/jobs').trim()].filter(Boolean),
    selectors: {
      jobCard: 'article.job-card',
      title: '.job-title',
      company: '.company-name',
      location: '.job-location',
      description: '.job-description',
      applyLink: { selector: 'a.job-link', attr: 'href', resolveUrl: true },
    },
    defaults: {
      location: 'Cameroun',
      description: 'Consultez l’offre d’origine pour les détails complets et pour candidater.',
    },
    requestConfig: {},
  },
];

let cachedDefaultPrisma = null;

function getDefaultPrisma() {
  if (!cachedDefaultPrisma) {
    cachedDefaultPrisma = require('../lib/db').prisma;
  }

  return cachedDefaultPrisma;
}

function isScraperEnabled() {
  return String(process.env.JOB_SCRAPER_ENABLED || 'false').trim().toLowerCase() === 'true';
}

function getScraperSchedule() {
  return String(process.env.JOB_SCRAPER_SCHEDULE || '0 3 * * *').trim();
}

function getScraperTimezone() {
  return String(process.env.JOB_SCRAPER_TIMEZONE || 'Africa/Douala').trim();
}

function getDefaultJobStatus() {
  const normalized = String(process.env.JOB_SCRAPER_DEFAULT_STATUS || 'PENDING').trim().toUpperCase();
  return VALID_JOB_STATUSES.has(normalized) ? normalized : 'PENDING';
}

function getBotUserId() {
  const parsedValue = Number.parseInt(String(process.env.BOT_USER_ID || '').trim(), 10);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error('BOT_USER_ID doit contenir un identifiant utilisateur numerique valide.');
  }

  return parsedValue;
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeKey(value) {
  return normalizeText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function resolveUrl(baseUrl, candidateUrl) {
  if (!candidateUrl) {
    return '';
  }

  try {
    return new URL(String(candidateUrl).trim(), baseUrl).toString();
  } catch {
    return '';
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRandomDelayMs() {
  return 2000 + Math.floor(Math.random() * 3001);
}

async function waitPolitely(siteName, pageUrl) {
  const delayMs = getRandomDelayMs();
  console.log(`[CRON][SCRAPER][${siteName}] Pause de ${delayMs}ms avant la page suivante (${pageUrl}).`);
  await sleep(delayMs);
}

function readCardValue($card, selectorConfig, pageUrl) {
  if (!selectorConfig) {
    return '';
  }

  if (typeof selectorConfig === 'function') {
    return normalizeText(selectorConfig({ $card, pageUrl }));
  }

  if (typeof selectorConfig === 'string') {
    return normalizeText($card.find(selectorConfig).first().text());
  }

  if (typeof selectorConfig !== 'object') {
    return '';
  }

  const node = selectorConfig.selector ? $card.find(selectorConfig.selector).first() : $card;
  let value = selectorConfig.attr ? node.attr(selectorConfig.attr) : node.text();

  if (selectorConfig.resolveUrl || selectorConfig.attr === 'href') {
    value = resolveUrl(pageUrl, value);
  }

  if (typeof selectorConfig.transform === 'function') {
    value = selectorConfig.transform(value, { pageUrl });
  }

  return normalizeText(value);
}

function buildScrapedJob($card, siteConfig, pageUrl) {
  const selectors = siteConfig.selectors || {};
  const defaults = siteConfig.defaults || {};

  const title = readCardValue($card, selectors.title, pageUrl);
  const company = readCardValue($card, selectors.company, pageUrl) || normalizeText(defaults.company);
  const location = readCardValue($card, selectors.location, pageUrl) || normalizeText(defaults.location) || 'Non precise';
  const description = readCardValue($card, selectors.description, pageUrl) || normalizeText(defaults.description);
  const externalApplyUrl = readCardValue($card, selectors.applyLink || selectors.detailLink, pageUrl) || pageUrl;

  if (!title || !company || !description) {
    return null;
  }

  return {
    title,
    company,
    location,
    description,
    externalApplyUrl,
  };
}

function computeJobFingerprint(job) {
  return crypto
    .createHash('sha256')
    .update([
      normalizeKey(job?.title),
      normalizeKey(job?.company),
      normalizeKey(job?.location),
    ].join('|'))
    .digest('hex');
}

async function findExistingJob(prisma, candidate) {
  if (candidate.externalApplyUrl) {
    const existingByUrl = await prisma.job.findFirst({
      where: { externalApplyUrl: candidate.externalApplyUrl },
      select: { id: true, reference: true, externalApplyUrl: true },
    });

    if (existingByUrl) {
      return existingByUrl;
    }
  }

  const fingerprint = computeJobFingerprint(candidate);
  const possibleMatches = await prisma.job.findMany({
    where: {
      title: { equals: candidate.title, mode: 'insensitive' },
      company: { equals: candidate.company, mode: 'insensitive' },
    },
    select: {
      id: true,
      title: true,
      company: true,
      location: true,
      reference: true,
    },
    take: 25,
  });

  return possibleMatches.find((job) => computeJobFingerprint(job) === fingerprint) || null;
}

async function createScrapedJob(prisma, candidate, botUserId, status) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = generateJobReference();
    const slug = generateSlug(candidate.title, candidate.location, reference);

    try {
      return await prisma.job.create({
        data: {
          reference,
          slug,
          title: candidate.title,
          company: candidate.company,
          location: candidate.location,
          description: candidate.description,
          externalApplyUrl: candidate.externalApplyUrl,
          status,
          authorId: botUserId,
        },
      });
    } catch (error) {
      if (error && error.code === 'P2002') {
        continue;
      }

      throw error;
    }
  }

  throw new Error('JOB_SCRAPER_REFERENCE_GENERATION_FAILED');
}

function createHttpClient(siteConfig = {}) {
  return axios.create({
    timeout: Number(process.env.JOB_SCRAPER_TIMEOUT_MS || 20000),
    maxRedirects: 5,
    headers: {
      ...DEFAULT_HEADERS,
      ...(siteConfig.requestConfig?.headers || {}),
    },
    ...siteConfig.requestConfig,
  });
}

async function scrapeSiteX(siteConfig, { prisma, botUserId, status } = {}) {
  const db = prisma || getDefaultPrisma();
  const effectiveBotUserId = botUserId || getBotUserId();
  const effectiveStatus = status || getDefaultJobStatus();
  const httpClient = createHttpClient(siteConfig);
  const pageUrls = Array.isArray(siteConfig.pageUrls) ? siteConfig.pageUrls.filter(Boolean) : [];
  const summary = {
    site: siteConfig.name || 'unknown-site',
    pages: 0,
    scanned: 0,
    created: 0,
    duplicates: 0,
    skipped: 0,
    errors: 0,
  };

  if (!siteConfig?.selectors?.jobCard) {
    throw new Error(`[CRON][SCRAPER][${summary.site}] selectors.jobCard est obligatoire.`);
  }

  for (let index = 0; index < pageUrls.length; index += 1) {
    const pageUrl = assertPublicHttpsUrl(pageUrls[index]);

    try {
      console.log(`[CRON][SCRAPER][${summary.site}] Scraping ${pageUrl}...`);
      const response = await httpClient.get(pageUrl);
      const $ = cheerio.load(response.data);
      const cards = $(siteConfig.selectors.jobCard).toArray();

      summary.pages += 1;

      for (const card of cards) {
        summary.scanned += 1;

        try {
          const candidate = buildScrapedJob($(card), siteConfig, pageUrl);
          if (!candidate) {
            summary.skipped += 1;
            continue;
          }

          candidate.externalApplyUrl = assertPublicHttpsUrl(candidate.externalApplyUrl);

          const existingJob = await findExistingJob(db, candidate);
          if (existingJob) {
            summary.duplicates += 1;
            continue;
          }

          await createScrapedJob(db, candidate, effectiveBotUserId, effectiveStatus);
          summary.created += 1;
        } catch (error) {
          summary.errors += 1;
          console.error(`[CRON][SCRAPER][${summary.site}] Offre ignoree :`, error.message || error);
        }
      }
    } catch (error) {
      summary.errors += 1;
      console.error(`[CRON][SCRAPER][${summary.site}] Echec page ${pageUrl}:`, error.message || error);
    }

    if (index < pageUrls.length - 1) {
      await waitPolitely(summary.site, pageUrl);
    }
  }

  return summary;
}

async function runJobScraper({ prisma } = {}) {
  const db = prisma || getDefaultPrisma();
  const enabledSites = SCRAPER_SITES.filter((site) => site.enabled);

  if (!enabledSites.length) {
    console.log('[CRON][SCRAPER] Aucune source active. Activez JOB_SCRAPER_SITE_X_ENABLED=true et configurez vos selecteurs.');
    return { sites: 0, pages: 0, scanned: 0, created: 0, duplicates: 0, skipped: 0, errors: 0 };
  }

  const botUserId = getBotUserId();
  const botUser = await db.user.findUnique({
    where: { id: botUserId },
    select: { id: true },
  });

  if (!botUser) {
    throw new Error(`BOT_USER_ID=${botUserId} ne correspond a aucun utilisateur.`);
  }

  const totals = {
    sites: enabledSites.length,
    pages: 0,
    scanned: 0,
    created: 0,
    duplicates: 0,
    skipped: 0,
    errors: 0,
  };

  for (const siteConfig of enabledSites) {
    const summary = await scrapeSiteX(siteConfig, {
      prisma: db,
      botUserId,
      status: getDefaultJobStatus(),
    });

    totals.pages += summary.pages;
    totals.scanned += summary.scanned;
    totals.created += summary.created;
    totals.duplicates += summary.duplicates;
    totals.skipped += summary.skipped;
    totals.errors += summary.errors;
  }

  return totals;
}

function startJobScraper(prisma) {
  const db = prisma || getDefaultPrisma();

  if (!isScraperEnabled()) {
    console.log('[CRON][SCRAPER] Desactive par configuration (JOB_SCRAPER_ENABLED=false).');
    return null;
  }

  const schedule = getScraperSchedule();
  const timezone = getScraperTimezone();

  const task = cron.schedule(schedule, async () => {
    console.log('[CRON][SCRAPER] Lancement du scraping automatise des offres externes...');

    try {
      const summary = await runJobScraper({ prisma: db });
      console.log(
        `[CRON][SCRAPER] Termine : ${summary.created} creee(s), ${summary.duplicates} doublon(s), `
          + `${summary.skipped} ignoree(s), ${summary.errors} erreur(s), ${summary.scanned} offre(s) inspectee(s) `
          + `sur ${summary.pages} page(s).`
      );
    } catch (error) {
      console.error('[CRON][SCRAPER] Echec global :', error);
    }
  }, { timezone });

  console.log(`⏰ [CRON][SCRAPER] Arme (${schedule}, fuseau ${timezone}).`);
  return task;
}

if (require.main === module) {
  (async () => {
    try {
      const summary = await runJobScraper();
      console.log('[CRON][SCRAPER] Execution manuelle terminee :', summary);
    } catch (error) {
      console.error('[CRON][SCRAPER] Execution manuelle en echec :', error);
      process.exitCode = 1;
    } finally {
      try {
        await getDefaultPrisma().$disconnect();
      } catch {
        // noop
      }
    }
  })();
}

module.exports = {
  SCRAPER_SITES,
  scrapeSiteX,
  runJobScraper,
  startJobScraper,
};