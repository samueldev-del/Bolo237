import type { MetadataRoute } from 'next';
import { SITEMAP_SECTIONS, buildAlternates, localizedUrl } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return SITEMAP_SECTIONS.map((section) => ({
    url: localizedUrl(section.path, 'fr'),
    lastModified,
    changeFrequency: section.changeFrequency,
    priority: section.priority,
    alternates: {
      languages: buildAlternates(section.path).languages,
    },
  }));
}
