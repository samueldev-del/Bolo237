const { buildPublicUrl } = require('./transactionalEmail');

const DEFAULT_MAX_JOBS_PER_ALERT = 25;
const FREQUENCY_IN_MS = {
  DAILY: 24 * 60 * 60 * 1000,
  WEEKLY: 7 * 24 * 60 * 60 * 1000,
};

function normalizeKeywords(value) {
  return String(value || '')
    .split(/[\s,;|]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function getAlertIntervalMs(frequency) {
  return FREQUENCY_IN_MS[String(frequency || 'DAILY').toUpperCase()] || FREQUENCY_IN_MS.DAILY;
}

function isAlertDue(alert, now = new Date()) {
  if (!alert?.isActive) return false;
  if (!alert?.lastSentAt) return true;
  return now.getTime() - new Date(alert.lastSentAt).getTime() >= getAlertIntervalMs(alert.frequency);
}

function getAlertWindowStart(alert, now = new Date()) {
  if (alert?.lastSentAt) {
    return new Date(alert.lastSentAt);
  }

  return new Date(now.getTime() - getAlertIntervalMs(alert?.frequency));
}

function buildAlertSearchClauses(tokens) {
  return tokens.map((token) => ({
    OR: [
      { title: { contains: token, mode: 'insensitive' } },
      { titleFr: { contains: token, mode: 'insensitive' } },
      { titleEn: { contains: token, mode: 'insensitive' } },
      { title_fr: { contains: token, mode: 'insensitive' } },
      { title_en: { contains: token, mode: 'insensitive' } },
      { company: { contains: token, mode: 'insensitive' } },
      { location: { contains: token, mode: 'insensitive' } },
      { description: { contains: token, mode: 'insensitive' } },
      { descriptionFr: { contains: token, mode: 'insensitive' } },
      { descriptionEn: { contains: token, mode: 'insensitive' } },
      { description_fr: { contains: token, mode: 'insensitive' } },
      { description_en: { contains: token, mode: 'insensitive' } },
      { reference: { contains: token, mode: 'insensitive' } },
    ],
  }));
}

function buildJobAlertWhere(alert, now = new Date()) {
  const tokens = normalizeKeywords(alert?.keywords);
  const andClauses = buildAlertSearchClauses(tokens);
  const location = String(alert?.location || '').trim();

  if (location) {
    andClauses.push({
      location: { contains: location, mode: 'insensitive' },
    });
  }

  return {
    status: 'APPROVED',
    createdAt: { gt: getAlertWindowStart(alert, now) },
    ...(andClauses.length > 0 ? { AND: andClauses } : {}),
  };
}

async function findMatchingJobsForAlert({ prisma, alert, now = new Date(), take = DEFAULT_MAX_JOBS_PER_ALERT }) {
  return prisma.job.findMany({
    where: buildJobAlertWhere(alert, now),
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      title: true,
      titleFr: true,
      titleEn: true,
      company: true,
      location: true,
      slug: true,
      reference: true,
      createdAt: true,
    },
  });
}

function buildAlertSearchUrl(alert) {
  const params = new URLSearchParams();
  const keywords = String(alert?.keywords || '').trim();
  const location = String(alert?.location || '').trim();

  if (keywords) params.set('search', keywords);
  if (location) params.set('location', location);

  const query = params.toString();
  return buildPublicUrl(query ? `/emplois?${query}` : '/emplois');
}

function buildJobAlertDigestPayload({ alert, jobs }) {
  const count = Array.isArray(jobs) ? jobs.length : 0;
  const hasMany = count > 1;
  const headline = hasMany
    ? `${count} nouvelles offres correspondent à votre alerte`
    : 'Une nouvelle offre correspond à votre alerte';
  const introLocation = String(alert?.location || '').trim();
  const intro = introLocation
    ? `Nous avons repéré de nouvelles annonces pour « ${String(alert?.keywords || '').trim()} » à ${introLocation}.`
    : `Nous avons repéré de nouvelles annonces pour « ${String(alert?.keywords || '').trim()} ». `;
  const details = jobs.slice(0, 5).map((job) => {
    const title = String(job?.title || job?.titleFr || job?.titleEn || 'Annonce').trim();
    const company = String(job?.company || 'Entreprise').trim();
    const location = String(job?.location || 'Cameroun').trim();
    return `${title} — ${company} · ${location}`;
  });

  if (count > 5) {
    details.push(`${count - 5} autre${count - 5 > 1 ? 's' : ''} annonce${count - 5 > 1 ? 's' : ''} sont disponibles sur Bolo237.`);
  }

  return {
    subject: `[Bolo237] ${headline}`,
    headline,
    intro: intro.trim(),
    details,
    ctaLabel: 'Voir les offres',
    ctaUrl: buildAlertSearchUrl(alert),
    footer: 'Vous recevez cet e-mail car vous avez activé une alerte emploi sur Bolo237.',
  };
}

async function runJobAlertsDigest({
  prisma,
  now = new Date(),
  sendEmail,
  take = DEFAULT_MAX_JOBS_PER_ALERT,
  logger = console,
} = {}) {
  if (!prisma) {
    throw new Error('Prisma est requis pour exécuter les alertes emploi.');
  }

  const alerts = await prisma.jobAlert.findMany({
    where: { isActive: true },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const summary = {
    scanned: alerts.length,
    due: 0,
    processed: 0,
    matchedJobs: 0,
    emailsSent: 0,
    emailsSkipped: 0,
    emailsErrored: 0,
  };

  for (const alert of alerts) {
    if (!isAlertDue(alert, now)) continue;
    summary.due += 1;

    const jobs = await findMatchingJobsForAlert({ prisma, alert, now, take });
    summary.matchedJobs += jobs.length;

    if (jobs.length === 0) {
      await prisma.jobAlert.update({
        where: { id: alert.id },
        data: { lastSentAt: now },
      });
      summary.processed += 1;
      continue;
    }

    const payload = buildJobAlertDigestPayload({ alert, jobs });
    const delivery = typeof sendEmail === 'function'
      ? await sendEmail({ user: alert.user, alert, jobs, payload })
      : { delivery: 'prepared', sent: 0 };

    if (delivery?.delivery === 'error') {
      summary.emailsErrored += 1;
      logger.error('[JOB ALERTS] Envoi en échec', { alertId: alert.id, userId: alert.userId });
      continue;
    }

    await prisma.jobAlert.update({
      where: { id: alert.id },
      data: { lastSentAt: now },
    });

    summary.processed += 1;

    if (delivery?.delivery === 'sent') {
      summary.emailsSent += Number(delivery?.sent || 1);
    } else {
      summary.emailsSkipped += 1;
    }
  }

  return summary;
}

module.exports = {
  buildJobAlertDigestPayload,
  buildJobAlertWhere,
  findMatchingJobsForAlert,
  getAlertWindowStart,
  isAlertDue,
  runJobAlertsDigest,
};