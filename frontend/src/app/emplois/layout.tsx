import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Offres d\'emploi au Cameroun | Bolo237',
  description: 'Découvrez toutes les offres d\'emploi disponibles au Cameroun. CDI, CDD, freelance dans tous les secteurs.',
  openGraph: {
    title: 'Offres d\'emploi au Cameroun | Bolo237',
    description: 'Découvrez toutes les offres d\'emploi disponibles au Cameroun. CDI, CDD, freelance dans tous les secteurs.',
    type: 'website',
    siteName: 'Bolo237',
    locale: 'fr_CM',
    url: 'https://www.bolo237.com/emplois',
  },
};

export default function EmploisLayout({ children }: { children: React.ReactNode }) {
  return children;
}
