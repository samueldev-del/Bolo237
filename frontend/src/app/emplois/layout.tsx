import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Offres d\'emploi au Cameroun | 237jobs',
  description: 'Découvrez toutes les offres d\'emploi disponibles au Cameroun. CDI, CDD, freelance dans tous les secteurs.',
  openGraph: {
    title: 'Offres d\'emploi au Cameroun | 237jobs',
    description: 'Découvrez toutes les offres d\'emploi disponibles au Cameroun. CDI, CDD, freelance dans tous les secteurs.',
    type: 'website',
    siteName: '237jobs',
    locale: 'fr_CM',
    url: 'https://237jobs.com/emplois',
  },
};

export default function EmploisLayout({ children }: { children: React.ReactNode }) {
  return children;
}
