import type { Metadata } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type LayoutProps = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const res = await fetch(`${API_BASE}/api/jobs/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error('Not found');
    const job = await res.json();

    const title = `${job.title} - ${job.company} | Bolo237`;
    const description = job.description?.slice(0, 160) || `Offre d'emploi ${job.title} chez ${job.company} à ${job.location}`;

    return {
      title,
      description,
      alternates: {
        canonical: `https://www.bolo237.com/fr/annonce/${id}`,
        languages: {
          fr: `https://www.bolo237.com/fr/annonce/${id}`,
          en: `https://www.bolo237.com/en/annonce/${id}`,
          'x-default': `https://www.bolo237.com/fr/annonce/${id}`,
        },
      },
      openGraph: {
        title,
        description,
        type: 'article',
        siteName: 'Bolo237',
        locale: 'fr_CM',
        url: `https://www.bolo237.com/fr/annonce/${id}`,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  } catch {
    const title = 'Offre d\'emploi | Bolo237';
    const description = 'Consultez cette offre d\'emploi sur Bolo237, la plateforme emploi du Cameroun.';
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        siteName: 'Bolo237',
        locale: 'fr_CM',
      },
      twitter: {
        card: 'summary_large_image' as const,
        title,
        description,
      },
    };
  }
}

export default function AnnonceLayout({ children }: LayoutProps) {
  return children;
}
