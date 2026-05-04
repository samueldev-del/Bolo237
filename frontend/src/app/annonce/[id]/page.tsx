import type { Metadata } from 'next';
import AnnonceDetailClient from './AnnonceDetailClient';
import { buildAlternates, SITE_URL, truncateText } from '@/lib/seo';
import { buildJobDetailSegment, parseJobIdFromSegment } from '@/lib/jobSlug';

type Props = { params: Promise<{ id: string }> };
const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5000';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const numericId = parseJobIdFromSegment(id);
  if (!numericId) {
    return { title: "Offre d'emploi | Bolo237" };
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/jobs/${numericId}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { title: "Offre d'emploi | Bolo237" };

    const job = await res.json();
    const path = `/annonce/${buildJobDetailSegment(job)}`;
    const title = `${job.title} à ${job.location} | ${job.company} | Bolo237`;
    const description = truncateText(
      String(job.descriptionFr || job.description || '').replace(/\s+/g, ' ').trim() ||
        `Postulez à cette offre chez ${job.company} à ${job.location} sur Bolo237.`,
      160
    );
    const ogImage = job.logoUrl || `${SITE_URL}/og-image.png`;

    return {
      title,
      description,
      alternates: buildAlternates(path, 'fr'),
      openGraph: {
        title,
        description,
        type: 'article',
        siteName: 'Bolo237',
        locale: 'fr_CM',
        url: `${SITE_URL}/fr${path}`,
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: `${job.title} – ${job.company} | Bolo237`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
    };
  } catch {
    return { title: "Offre d'emploi | Bolo237" };
  }
}

export default function Page({ params }: Props) {
  return <AnnonceDetailClient params={params} />;
}
