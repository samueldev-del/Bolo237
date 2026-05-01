import type { Metadata } from 'next';
import AnnonceDetailClient from './AnnonceDetailClient';

type Props = { params: Promise<{ id: string }> };

const SITE_URL = 'https://www.bolo237.com';
const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5000';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId) || numericId <= 0) {
    return { title: "Offre d'emploi | Bolo237" };
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/jobs/${numericId}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { title: "Offre d'emploi | Bolo237" };

    const job = await res.json();
    const rawDesc = String(job.description || '').replace(/\s+/g, ' ').trim();
    const title = `${job.title} – ${job.company} | Bolo237`;
    const description = rawDesc.slice(0, 160) ||
      `Postulez à cette offre chez ${job.company} sur Bolo237 au Cameroun.`;
    const ogImage = job.logoUrl || `${SITE_URL}/og-image.png`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        siteName: 'Bolo237',
        locale: 'fr_CM',
        url: `${SITE_URL}/fr/annonce/${numericId}`,
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
