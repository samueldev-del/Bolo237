import type { ApiJob } from '@/lib/api';

export type JobListing = {
  id: number;
  title: string;
  company: string;
  logoInitials: string;
  logoColor: string;
  logoUrl: string | null;
  isVerified: boolean;
  location: string;
  region: string;
  city: string;
  salary: string | null;
  description: string;
  postedLabel: string;
  publishedHours: number;
  workMode: 'onsite' | 'partial' | 'remote';
  applicationType: 'bolo237' | 'external';
  contractType: 'cdi' | 'cdd' | 'stage' | 'freelance';
  experienceLevel: 'junior' | 'confirmed' | 'senior';
  workTime: 'full' | 'part';
  isNew: boolean;
};

const LOGO_COLORS = ['#0F4C81', '#059669', '#D97706', '#DC2626', '#EA580C', '#2563EB', '#0891B2'];

const EXTERNAL_APPLY_MARKER_PATTERN = /(postuler sur le site de l'entreprise|lien de candidature|apply on company site)\s*[:\-]\s*https?:\/\/[^\s]+/gi;

export function extractExternalApplyUrl(description: string): string | null {
  const text = String(description || '');
  if (!text) {
    return null;
  }

  const markerPattern = /(postuler sur le site de l'entreprise|lien de candidature|apply on company site)\s*[:\-]\s*(https?:\/\/[^\s]+)/i;
  const markerMatch = text.match(markerPattern);
  return markerMatch?.[2]?.trim() || null;
}

export function sanitizeJobDescription(description: string): string {
  return String(description || '')
    .replace(EXTERNAL_APPLY_MARKER_PATTERN, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function inferWorkMode(location: string, description: string): JobListing['workMode'] {
  const text = `${location} ${description}`.toLowerCase();

  if (text.includes('100% teletravail') || text.includes('100% remote') || text.includes('full remote')) {
    return 'remote';
  }

  if (
    text.includes('teletravail partiel') ||
    text.includes('hybride') ||
    text.includes('hybrid') ||
    text.includes('partially remote') ||
    text.includes('home-office')
  ) {
    return 'partial';
  }

  return 'onsite';
}

function inferContractType(title: string, description: string): JobListing['contractType'] {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes('stage') || text.includes('intern')) return 'stage';
  if (text.includes('freelance') || text.includes('consultant')) return 'freelance';
  if (text.includes('cdd') || text.includes('contract')) return 'cdd';
  return 'cdi';
}

function inferExperienceLevel(title: string, description: string): JobListing['experienceLevel'] {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes('senior') || text.includes('lead') || text.includes('manager') || text.includes('head')) {
    return 'senior';
  }

  if (text.includes('junior') || text.includes('assistant') || text.includes('entry')) {
    return 'junior';
  }

  return 'confirmed';
}

function inferWorkTime(title: string, description: string): JobListing['workTime'] {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes('temps partiel') || text.includes('part-time') || text.includes('teilzeit') || text.includes('minijob')) {
    return 'part';
  }

  return 'full';
}

function inferCity(location: string): string {
  const normalized = String(location || '').trim();
  if (!normalized) return 'Autres';

  return normalized.split(/[\/,]/)[0]?.trim() || 'Autres';
}

function inferRegion(location: string): string {
  const text = String(location || '').toLowerCase();

  if (text.includes('douala') || text.includes('littoral')) return 'Littoral';
  if (text.includes('yaound') || text.includes('centre')) return 'Centre';
  if (text.includes('bafoussam') || text.includes('ouest')) return 'Ouest';
  if (text.includes('bamenda') || text.includes('nord-ouest')) return 'Nord-Ouest';
  if (text.includes('buea') || text.includes('limbe') || text.includes('sud-ouest')) return 'Sud-Ouest';
  if (text.includes('garoua') || text.includes('nord')) return 'Nord';
  if (text.includes('bertoua') || text.includes('est')) return 'Est';
  if (text.includes('kribi') || text.includes('sud')) return 'Sud';
  if (text.includes('maroua') || text.includes('extreme-nord')) return 'Extreme-Nord';
  if (text.includes('ngaound') || text.includes('adamaoua')) return 'Adamaoua';

  return 'Autres';
}

export function formatTimeAgo(createdAt: string, isEn: boolean): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));

  if (hours < 1) return isEn ? 'just now' : "À l'instant";
  if (hours < 24) return isEn ? `${hours}h ago` : `Il y a ${hours}h`;
  if (hours < 168) {
    const days = Math.floor(hours / 24);
    return isEn ? `${days}d ago` : `Il y a ${days} jour${days > 1 ? 's' : ''}`;
  }

  const weeks = Math.floor(hours / 168);
  return isEn ? `${weeks}w ago` : `Il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`;
}

export function getContractLabel(contract: JobListing['contractType'], isEn: boolean): string {
  if (contract === 'cdd') return 'CDD';
  if (contract === 'stage') return isEn ? 'Internship' : 'Stage';
  if (contract === 'freelance') return 'Freelance';
  return 'CDI';
}

export function getWorkModeLabel(mode: JobListing['workMode'], isEn: boolean): string {
  if (mode === 'remote') return isEn ? 'Remote' : 'Télétravail';
  if (mode === 'partial') return isEn ? 'Hybrid' : 'Hybride';
  return isEn ? 'On-site' : 'Sur site';
}

export function getExperienceLabel(level: JobListing['experienceLevel'], isEn: boolean): string {
  if (level === 'junior') return isEn ? 'Junior' : 'Junior';
  if (level === 'senior') return isEn ? 'Senior' : 'Senior';
  return isEn ? 'Confirmed' : 'Confirmé';
}

export function getWorkTimeLabel(workTime: JobListing['workTime'], isEn: boolean): string {
  return workTime === 'full' ? (isEn ? 'Full-time' : 'Temps plein') : (isEn ? 'Part-time' : 'Temps partiel');
}

function pickLocalizedText(primary?: string | null, secondary?: string | null, legacy?: string | null): string {
  const primaryValue = String(primary || '').trim();
  if (primaryValue) return primaryValue;

  const secondaryValue = String(secondary || '').trim();
  if (secondaryValue) return secondaryValue;

  return String(legacy || '').trim();
}

export function getLocalizedJobTitle(job: ApiJob, isEn: boolean): string {
  return isEn
    ? pickLocalizedText(job.titleEn, job.titleFr, job.title)
    : pickLocalizedText(job.titleFr, job.titleEn, job.title);
}

export function getLocalizedJobDescription(job: ApiJob, isEn: boolean): string {
  return isEn
    ? pickLocalizedText(job.descriptionEn, job.descriptionFr, job.description)
    : pickLocalizedText(job.descriptionFr, job.descriptionEn, job.description);
}

export function mapApiJobToListing(job: ApiJob, index: number, isEn: boolean): JobListing {
  const publishedHours = Math.max(0, Math.floor((Date.now() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60)));
  const localizedTitle = getLocalizedJobTitle(job, isEn);
  const localizedDescription = getLocalizedJobDescription(job, isEn);
  const description = sanitizeJobDescription(localizedDescription || job.description || '');
  const externalApplyUrl = String(job.externalApplyUrl || '').trim() || extractExternalApplyUrl(description);

  return {
    id: job.id,
    title: localizedTitle || job.title,
    company: job.company,
    logoInitials: (job.company || '??').slice(0, 2).toUpperCase(),
    logoColor: LOGO_COLORS[index % LOGO_COLORS.length],
    logoUrl: job.author?.photoUrl || null,
    isVerified: job.author?.isVerified || false,
    location: job.location,
    region: inferRegion(job.location),
    city: inferCity(job.location),
    salary: job.salary,
    description,
    postedLabel: formatTimeAgo(job.createdAt, isEn),
    publishedHours,
    workMode: inferWorkMode(job.location, description),
    applicationType: externalApplyUrl ? 'external' : 'bolo237',
    contractType: inferContractType(localizedTitle || job.title, description),
    experienceLevel: inferExperienceLevel(localizedTitle || job.title, description),
    workTime: inferWorkTime(localizedTitle || job.title, description),
    isNew: publishedHours < 72,
  };
}