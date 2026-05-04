import type { ApiJob } from '@/lib/api';

function normalizeSegment(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function normalizeReference(reference: string | null | undefined) {
  return String(reference || '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase();
}

export function generateSlug(title?: string | null, location?: string | null, reference?: string | null) {
  return [normalizeSegment(title), normalizeSegment(location), normalizeReference(reference)]
    .filter(Boolean)
    .join('-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildJobDetailSegment(job: Pick<ApiJob, 'id' | 'slug' | 'title' | 'titleFr' | 'titleEn' | 'location' | 'reference'>) {
  const persistedSlug = String(job.slug || '').trim();
  const fallbackSlug = generateSlug(job.titleFr || job.titleEn || job.title, job.location, job.reference || null);
  const suffix = persistedSlug || fallbackSlug;
  return suffix ? `${job.id}-${suffix}` : String(job.id);
}

export function parseJobIdFromSegment(segment: string) {
  const numericId = parseInt(String(segment || '').trim(), 10);
  return Number.isFinite(numericId) && numericId > 0 ? numericId : null;
}

export function buildJobDetailPath(job: Pick<ApiJob, 'id' | 'slug' | 'title' | 'titleFr' | 'titleEn' | 'location' | 'reference'>) {
  return `/annonce/${buildJobDetailSegment(job)}`;
}