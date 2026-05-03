import type { MetadataRoute } from 'next';
import { SITEMAP_SECTIONS, buildAlternates, localizedUrl, SITE_URL } from '@/lib/seo';

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5000';
const ENABLE_DYNAMIC_SITEMAP = process.env.SITEMAP_DYNAMIC === '1';

/** Fetch approved job IDs from the backend — fails gracefully. */
async function fetchApprovedJobIds(): Promise<number[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/jobs?limit=500`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const jobs: Array<{ id: number }> = Array.isArray(data)
      ? data
      : (data.jobs ?? data.data ?? []);
    return jobs.map((j) => j.id).filter((id) => typeof id === 'number' && id > 0);
  } catch {
    return [];
  }
}

/** Fetch visible artisan IDs from the backend — fails gracefully. */
async function fetchVisibleArtisanIds(): Promise<number[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/users/artisans?limit=500`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const artisans: Array<{ id: number }> = Array.isArray(data)
      ? data
      : (data.artisans ?? data.data ?? []);
    return artisans.map((a) => a.id).filter((id) => typeof id === 'number' && id > 0);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = SITEMAP_SECTIONS.map((section) => ({
    url: localizedUrl(section.path, 'fr'),
    lastModified,
    changeFrequency: section.changeFrequency,
    priority: section.priority,
    alternates: {
      languages: buildAlternates(section.path).languages,
    },
  }));

  const [jobIds, artisanIds] = ENABLE_DYNAMIC_SITEMAP
    ? await Promise.all([fetchApprovedJobIds(), fetchVisibleArtisanIds()])
    : [[], []];

  const jobEntries: MetadataRoute.Sitemap = jobIds.map((id) => ({
    url: `${SITE_URL}/fr/annonce/${id}`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
    alternates: {
      languages: {
        fr: `${SITE_URL}/fr/annonce/${id}`,
        en: `${SITE_URL}/en/annonce/${id}`,
        'x-default': `${SITE_URL}/fr/annonce/${id}`,
      },
    },
  }));

  const artisanEntries: MetadataRoute.Sitemap = artisanIds.map((id) => ({
    url: `${SITE_URL}/fr/artisan/${id}`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: 0.75,
    alternates: {
      languages: {
        fr: `${SITE_URL}/fr/artisan/${id}`,
        en: `${SITE_URL}/en/artisan/${id}`,
        'x-default': `${SITE_URL}/fr/artisan/${id}`,
      },
    },
  }));

  return [...staticEntries, ...jobEntries, ...artisanEntries];
}
