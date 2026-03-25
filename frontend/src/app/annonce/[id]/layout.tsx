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
      openGraph: {
        title,
        description,
        type: 'article',
        siteName: 'Bolo237',
        locale: 'fr_CM',
        url: `https://www.bolo237.com/annonce/${id}`,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  } catch {
    return {
      title: 'Offre d\'emploi | Bolo237',
      description: 'Consultez cette offre d\'emploi sur Bolo237, la plateforme emploi du Cameroun.',
    };
  }
}

export default function AnnonceLayout({ children }: LayoutProps) {
  return children;
}
